import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { app } from './server.js'
import { prisma } from './prisma.js'
import { createPasswordToken, hashPassword, passwordTokenHash } from './domain/admin-password-auth.js'

const databaseUrl = process.env.DATABASE_URL ?? ''
const enabled = process.env.OORO_ADMIN_AUTH_INTEGRATION_TESTS === 'true' && /ooro_test/.test(databaseUrl)

test('admin email/password workflow, generic failures, session revocation, and single-use reset', { skip: !enabled }, async () => {
  const suffix = randomUUID()
  const admin = await prisma.user.create({ data: { phone: `admin-auth-${suffix}`, email: `admin-${suffix}@example.test`, passwordHash: await hashPassword('correct horse battery staple'), role: 'SUPER_ADMIN', accountStatus: 'ACTIVE' } })
  const customer = await prisma.user.create({ data: { phone: `customer-auth-${suffix}`, email: `customer-${suffix}@example.test`, passwordHash: await hashPassword('correct horse battery staple'), role: 'DRIVER', accountStatus: 'ACTIVE' } })
  const login = await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: admin.email, password: 'correct horse battery staple' } })
  assert.equal(login.statusCode, 200, login.body)
  const tokens = login.json().data
  assert.ok(tokens.accessToken && tokens.refreshToken)
  assert.equal((await app.inject({ method: 'GET', url: '/api/auth/session', headers: { authorization: `Bearer ${tokens.accessToken}` } })).statusCode, 200)
  const wrongPassword = await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: admin.email, password: 'wrong password' } })
  const nonAdmin = await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: customer.email, password: 'correct horse battery staple' } })
  assert.equal(wrongPassword.statusCode, 401)
  assert.equal(nonAdmin.statusCode, 401)
  assert.equal(wrongPassword.json().error.message, nonAdmin.json().error.message)
  for (let attempt = 0; attempt < 4; attempt += 1) await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: admin.email, password: 'wrong password' } })
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: admin.email, password: 'correct horse battery staple' } })).statusCode, 401)
  await prisma.user.update({ where: { id: admin.id }, data: { failedLoginAttempts: 0, lockedUntil: null } })
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/logout', payload: { refreshToken: tokens.refreshToken } })).statusCode, 200)
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: tokens.refreshToken } })).statusCode, 401)
  const resetToken = createPasswordToken()
  await prisma.user.update({ where: { id: admin.id }, data: { passwordResetTokenHash: passwordTokenHash(resetToken), passwordResetTokenExpiresAt: new Date(Date.now() + 60_000) } })
  const reset = await app.inject({ method: 'POST', url: '/api/auth/admin/reset-password', payload: { token: resetToken, password: 'new correct horse battery staple' } })
  assert.equal(reset.statusCode, 200, reset.body)
  const concurrentToken = createPasswordToken()
  await prisma.user.update({ where: { id: admin.id }, data: { passwordResetTokenHash: passwordTokenHash(concurrentToken), passwordResetTokenExpiresAt: new Date(Date.now() + 60_000) } })
  const concurrentReuse = await Promise.all([1, 2].map(() => app.inject({ method: 'POST', url: '/api/auth/admin/reset-password', payload: { token: concurrentToken, password: 'another password here' } })))
  assert.equal(concurrentReuse.filter((response) => response.statusCode === 200).length, 1)
  assert.equal(concurrentReuse.filter((response) => response.statusCode === 400).length, 1)
  const sessionLogin = await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: admin.email, password: 'another password here' } })
  assert.equal(sessionLogin.statusCode, 200, sessionLogin.body)
  const expiredToken = createPasswordToken()
  await prisma.user.update({ where: { id: admin.id }, data: { passwordResetTokenHash: passwordTokenHash(expiredToken), passwordResetTokenExpiresAt: new Date(Date.now() - 1000) } })
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/admin/reset-password', payload: { token: expiredToken, password: 'another correct horse battery staple' } })).statusCode, 400)
  const revokeToken = createPasswordToken()
  await prisma.user.update({ where: { id: admin.id }, data: { passwordResetTokenHash: passwordTokenHash(revokeToken), passwordResetTokenExpiresAt: new Date(Date.now() + 60_000) } })
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/admin/reset-password', payload: { token: revokeToken, password: 'final correct horse battery staple' } })).statusCode, 200)
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: sessionLogin.json().data.refreshToken } })).statusCode, 401)
  const newLogin = await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: admin.email, password: 'final correct horse battery staple' } })
  assert.equal(newLogin.statusCode, 200, newLogin.body)
})

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
  const roleUsers = await Promise.all((['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'FINANCE', 'SUPPORT'] as const).map(async (role) => prisma.user.create({ data: { phone: `role-${role.toLowerCase()}-${suffix}`, email: `role-${role.toLowerCase()}-${suffix}@example.test`, passwordHash: await hashPassword('role test password 123'), role, accountStatus: 'ACTIVE' } })))
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
  const roleTokens = new Map<string, string>()
  for (const roleUser of roleUsers) {
    const roleLogin = await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: roleUser.email, password: 'role test password 123' } })
    assert.equal(roleLogin.statusCode, 200, `${roleUser.role}: ${roleLogin.body}`)
    roleTokens.set(roleUser.role, roleLogin.json().data.accessToken)
    assert.equal((await app.inject({ method: 'GET', url: '/api/admin/overview', headers: { authorization: `Bearer ${roleLogin.json().data.accessToken}` } })).statusCode, 200, roleUser.role)
  }
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS']) {
    const response = await app.inject({ method: 'POST', url: `/api/admin/displays/${randomUUID()}/commands`, headers: { authorization: `Bearer ${roleTokens.get(role)}` }, payload: { commandType: 'HEALTH_CHECK' } })
    assert.equal(response.statusCode, 404, `${role} must reach the protected device operation`)
  }
  for (const role of ['FINANCE', 'SUPPORT']) {
    const response = await app.inject({ method: 'POST', url: `/api/admin/displays/${randomUUID()}/commands`, headers: { authorization: `Bearer ${roleTokens.get(role)}` }, payload: { commandType: 'HEALTH_CHECK' } })
    assert.equal(response.statusCode, 403, `${role} must be denied device writes`)
  }
  assert.equal((await app.inject({ method: 'GET', url: '/api/admin/earnings', headers: { authorization: `Bearer ${roleTokens.get('FINANCE')}` } })).statusCode, 200)
  for (const role of ['OPERATIONS', 'SUPPORT']) assert.equal((await app.inject({ method: 'GET', url: '/api/admin/earnings', headers: { authorization: `Bearer ${roleTokens.get(role)}` } })).statusCode, 403, `${role} must not read finance data`)
  const readCases = [
    { name: 'device', paths: ['/api/admin/drivers', '/api/admin/vehicles', '/api/admin/displays', '/api/admin/displays/live-map', `/api/admin/displays/${randomUUID()}/live-state`, `/api/admin/displays/${randomUUID()}/location-history`], allowed: ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS'], denied: ['FINANCE', 'SUPPORT'] },
    { name: 'campaign proof', paths: ['/api/admin/proof-of-play'], allowed: ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT'], denied: ['FINANCE'] },
    { name: 'financial orders', paths: ['/api/admin/orders', `/api/admin/orders/order-${randomUUID()}`], allowed: ['ADMIN', 'SUPER_ADMIN', 'FINANCE'], denied: ['OPERATIONS', 'SUPPORT'] },
    { name: 'operational investigations', paths: ['/api/admin/rides', '/api/admin/verifications', '/api/admin/fraud'], allowed: ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS'], denied: ['FINANCE', 'SUPPORT'] },
  ] as const
  for (const testCase of readCases) {
    for (const path of testCase.paths) {
      const unauthenticated = await app.inject({ method: 'GET', url: path })
      assert.equal(unauthenticated.statusCode, 401, `${testCase.name} must require authentication`)
      assert.equal(unauthenticated.json().data, null, `${testCase.name} unauthenticated response must not contain data`)
      for (const role of testCase.allowed) {
        const response = await app.inject({ method: 'GET', url: path, headers: { authorization: `Bearer ${roleTokens.get(role)}` } })
        assert.notEqual(response.statusCode, 403, `${role} should retain ${testCase.name} access: ${path}`)
      }
      for (const role of testCase.denied) {
        const response = await app.inject({ method: 'GET', url: path, headers: { authorization: `Bearer ${roleTokens.get(role)}` } })
        assert.equal(response.statusCode, 403, `${role} must not access ${testCase.name}: ${path}`)
        assert.equal(response.json().data, null, `${role} denied response must not contain data`)
      }
    }
  }
  for (const role of ['ADMIN', 'SUPER_ADMIN']) assert.equal((await app.inject({ method: 'POST', url: `/api/admin/drivers/${randomUUID()}/restrict`, headers: { authorization: `Bearer ${roleTokens.get(role)}` } })).statusCode, 404, `${role} must reach admin driver restriction`)
  for (const role of ['OPERATIONS', 'FINANCE', 'SUPPORT']) assert.equal((await app.inject({ method: 'POST', url: `/api/admin/drivers/${randomUUID()}/restrict`, headers: { authorization: `Bearer ${roleTokens.get(role)}` } })).statusCode, 403, `${role} must not restrict drivers`)
  const lockUser = await prisma.user.create({ data: { phone: `lock-auth-${suffix}`, email: `lock-${suffix}@example.test`, passwordHash: await hashPassword('lock password 123'), role: 'ADMIN', accountStatus: 'ACTIVE' } })
  const lockoutResponses = []
  for (let attempt = 0; attempt < 5; attempt++) lockoutResponses.push((await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: lockUser.email, password: 'incorrect password 123' } })).statusCode)
  assert.ok(lockoutResponses.every(status => status === 401 || status === 429))
  assert.ok([401, 429].includes((await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: lockUser.email, password: 'lock password 123' } })).statusCode))
  const expiredToken = createPasswordToken()
  await prisma.user.update({ where: { id: lockUser.id }, data: { passwordResetTokenHash: passwordTokenHash(expiredToken), passwordResetTokenExpiresAt: new Date(Date.now() - 1_000) } })
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/admin/reset-password', payload: { token: expiredToken, password: 'expired password 123' } })).statusCode, 400)
  const concurrentUser = await prisma.user.create({ data: { phone: `concurrent-auth-${suffix}`, email: `concurrent-${suffix}@example.test`, role: 'ADMIN', accountStatus: 'ACTIVE' } })
  const concurrentToken = createPasswordToken()
  await prisma.user.update({ where: { id: concurrentUser.id }, data: { passwordResetTokenHash: passwordTokenHash(concurrentToken), passwordResetTokenExpiresAt: new Date(Date.now() + 60_000) } })
  const concurrent = await Promise.all([1, 2].map((index) => app.inject({ method: 'POST', url: '/api/auth/admin/reset-password', payload: { token: concurrentToken, password: `concurrent password ${index} 123` } })))
  assert.deepEqual(concurrent.map(response => response.statusCode).sort(), [200, 400])
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/logout', payload: { refreshToken: tokens.refreshToken } })).statusCode, 200)
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: tokens.refreshToken } })).statusCode, 401)
  const resetToken = createPasswordToken()
  await prisma.user.update({ where: { id: admin.id }, data: { passwordResetTokenHash: passwordTokenHash(resetToken), passwordResetTokenExpiresAt: new Date(Date.now() + 60_000) } })
  const reset = await app.inject({ method: 'POST', url: '/api/auth/admin/reset-password', payload: { token: resetToken, password: 'new correct horse battery staple' } })
  assert.equal(reset.statusCode, 200, reset.body)
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/admin/reset-password', payload: { token: resetToken, password: 'another password here' } })).statusCode, 400)
  await prisma.adminLoginAttempt.deleteMany()
  const newLogin = await app.inject({ method: 'POST', url: '/api/auth/admin/login', payload: { email: admin.email, password: 'new correct horse battery staple' } })
  assert.equal(newLogin.statusCode, 200, newLogin.body)
})

test('admin reset requests expire within ten minutes and reject expired tokens', { skip: !enabled }, async () => {
  const { config } = await import('./config.js')
  assert.equal(config.adminPasswordResetTtlSeconds, 600)
  const suffix = randomUUID()
  const user = await prisma.user.create({
    data: { phone: `reset-ttl-${suffix}`, email: `reset-ttl-${suffix}@example.test`, role: 'SUPER_ADMIN', accountStatus: 'ACTIVE', passwordHash: await hashPassword('old password is long') },
  })
  const before = Date.now()
  const requested = await app.inject({ method: 'POST', url: '/api/auth/admin/request-password-reset', payload: { email: user.email } })
  const after = Date.now()
  assert.equal(requested.statusCode, 202, requested.body)
  const issued = await prisma.user.findUniqueOrThrow({ where: { id: user.id } })
  assert.ok(issued.passwordResetTokenHash)
  assert.ok(issued.passwordResetTokenExpiresAt)
  const expiry = issued.passwordResetTokenExpiresAt.getTime()
  assert.ok(expiry >= before + 600_000 && expiry <= after + 600_000, 'reset token must expire exactly ten minutes after issuance')

  // The database expiry is authoritative; a previously issued token cannot be replayed.
  const token = createPasswordToken()
  await prisma.user.update({ where: { id: user.id }, data: {
    passwordResetTokenHash: passwordTokenHash(token),
    passwordResetTokenExpiresAt: new Date(Date.now() - 1000),
  } })
  const response = await app.inject({ method: 'POST', url: '/api/auth/admin/reset-password', payload: { token, password: 'new secure password 123' } })
  assert.equal(response.statusCode, 400, response.body)
})

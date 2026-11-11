import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { app } from './server.js'
import { prisma } from './prisma.js'
import { driverEmailOtpHash } from './domain/driver-auth.js'

const enabled = process.env.OORO_DRIVER_AUTH_INTEGRATION_TESTS === 'true' && /ooro_test/.test(process.env.DATABASE_URL ?? '')

test('email OTP creates one driver identity, consumes the code, and rejects replay', { skip: !enabled }, async () => {
  const email = `driver-${randomUUID()}@example.test`
  try {
    const requested = await app.inject({ method: 'POST', url: '/api/driver/auth/email/request-otp', payload: { email } })
    assert.equal(requested.statusCode, 202, requested.body)
    assert.match(requested.body, /If this email can be used/)
    const challenge = await prisma.driverEmailOtpChallenge.findFirst({ where: { email }, orderBy: { createdAt: 'desc' } })
    assert.ok(challenge)
    assert.notEqual(challenge.codeHash, '123456')

    const code = '123456'
    await prisma.driverEmailOtpChallenge.update({ where: { id: challenge.id }, data: { codeHash: driverEmailOtpHash(email, code) } })
    const verified = await app.inject({ method: 'POST', url: '/api/driver/auth/email/verify-otp', payload: { email, code } })
    assert.equal(verified.statusCode, 200, verified.body)
    const payload = verified.json().data
    assert.ok(payload.accessToken)
    assert.ok(payload.refreshToken)
    assert.equal(await prisma.user.count({ where: { email } }), 1)
    assert.equal(await prisma.driverAuthIdentity.count({ where: { provider: 'email', subject: email } }), 1)
    const replay = await app.inject({ method: 'POST', url: '/api/driver/auth/email/verify-otp', payload: { email, code } })
    assert.equal(replay.statusCode, 401)
  } finally {
    await prisma.user.deleteMany({ where: { email } })
  }
})

test('email OTP does not authenticate a phone-only driver by matching email', { skip: !enabled }, async () => {
  const email = `phone-only-${randomUUID()}@example.test`
  const user = await prisma.user.create({ data: { phone: `+9199${Date.now().toString().slice(-8)}`, email, role: 'DRIVER', accountStatus: 'PENDING', driver: { create: {} } } })
  try {
    const response = await app.inject({ method: 'POST', url: '/api/driver/auth/email/request-otp', payload: { email } })
    assert.equal(response.statusCode, 202)
    assert.equal(await prisma.driverEmailOtpChallenge.count({ where: { email } }), 0)
  } finally {
    await prisma.user.delete({ where: { id: user.id } })
  }
})

test('Google rejects malformed ID tokens without creating a driver', async () => {
  const response = await app.inject({ method: 'POST', url: '/api/driver/auth/google', payload: { idToken: 'not-a-valid-google-id-token' } })
  assert.ok([401, 404].includes(response.statusCode))
})

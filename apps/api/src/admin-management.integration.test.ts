import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID, createHash } from 'node:crypto'
import { app } from './server.js'
import { prisma } from './prisma.js'
import { issueTokens } from './http.js'
import { createPasswordToken, hashPassword, passwordTokenHash } from './domain/admin-password-auth.js'

const enabled = process.env.OORO_ADMIN_AUTH_INTEGRATION_TESTS === 'true' && /ooro_test/.test(process.env.DATABASE_URL ?? '')

test('Phase 2: Super Admin directory, invitation, lifecycle and immediately revoked sessions', { skip: !enabled }, async () => {
  const unique = randomUUID()
  let accountSequence = 0
  const make = async (role: string) => prisma.user.create({
    data: { phone: `phase2-${role}-${accountSequence++}-${unique}`, email: `phase2-${role}-${unique}@example.test`, role, accountStatus: 'ACTIVE', passwordHash: await hashPassword('secure test password 123') },
  })
  const primary = await make('SUPER_ADMIN')
  const secondary = await make('SUPER_ADMIN')
  const finance = await make('FINANCE')
  const support = await make('SUPPORT')
  // OTP for an administrator's phone must not return an administrator access token.
  const otpCode = '123456'
  await prisma.otpChallenge.create({ data: {
    phone: primary.phone,
    codeHash: createHash('sha256').update(`${primary.phone}:${otpCode}`).digest('hex'),
    expiresAt: new Date(Date.now() + 120000),
  } })
  const otpAttempt = await app.inject({ method: 'POST', url: '/api/auth/verify-otp', payload: { phone: primary.phone, code: otpCode } })
  assert.equal(otpAttempt.statusCode, 401, otpAttempt.body)
  assert.equal(await prisma.driver.count({ where: { userId: primary.id } }), 0)

  const adminToken = (await issueTokens(primary.id, primary.role)).accessToken
  const secondaryToken = (await issueTokens(secondary.id, secondary.role)).accessToken
  const financeToken = (await issueTokens(finance.id, finance.role)).accessToken
  const supportToken = (await issueTokens(support.id, support.role)).accessToken
  const auth = (token: string) => ({ authorization: `Bearer ${token}` })
  const listUrl = '/api/admin/users'
  assert.equal((await app.inject({ method: 'GET', url: listUrl })).statusCode, 401)
  for (const token of [financeToken, supportToken]) {
    const result = await app.inject({ method: 'GET', url: listUrl, headers: auth(token) })
    assert.equal(result.statusCode, 403)
    assert.equal(result.json().data, null)
  }
  const listed = await app.inject({ method: 'GET', url: listUrl, headers: auth(adminToken) })
  assert.equal(listed.statusCode, 200, listed.body)
  assert.equal(listed.body.includes('passwordHash'), false)
  assert.equal(listed.body.includes('passwordResetTokenHash'), false)
  assert.equal(listed.body.includes('refreshTokenHash'), false)

  // Verify the public invitation redemption with an explicitly known disposable token.
  const token = createPasswordToken()
  const invited = await prisma.adminInvitation.create({ data: {
    email: `invited-${unique}@example.test`, name: 'Invited Test Operator', role: 'OPERATIONS',
    tokenHash: passwordTokenHash(token), expiresAt: new Date(Date.now() + 3600000), createdById: primary.id,
  } })
  const payload = { token, phone: '+919876543210', password: 'correct horse battery staple' }
  // First use wins; replay cannot create a second admin.
  const accepted = await app.inject({ method: 'POST', url: '/api/auth/admin/accept-invitation', payload })
  assert.equal(accepted.statusCode, 200, accepted.body)
  const replay = await app.inject({ method: 'POST', url: '/api/auth/admin/accept-invitation', payload })
  assert.equal(replay.statusCode, 400, replay.body)
  const invitation = await prisma.adminInvitation.findUniqueOrThrow({ where: { id: invited.id } })
  assert.ok(invitation.acceptedAt)
  const acceptedUser = await prisma.user.findUniqueOrThrow({ where: { email: invited.email } })
  assert.equal(acceptedUser.role, 'OPERATIONS')

  const expiredToken = createPasswordToken()
  await prisma.adminInvitation.create({ data: {
    email: `expired-${unique}@example.test`, name: 'Expired', role: 'SUPPORT',
    tokenHash: passwordTokenHash(expiredToken), expiresAt: new Date(Date.now() - 1000), createdById: primary.id,
  } })
  assert.equal((await app.inject({ method: 'POST', url: '/api/auth/admin/accept-invitation',
    payload: { token: expiredToken, phone: '+919876543211', password: 'correct horse battery staple' } })).statusCode, 400)

  // Never disable the final active Super Admin.
  const stopSecondary = await app.inject({ method: 'PATCH', url: `/api/admin/users/${secondary.id}`,
    headers: auth(adminToken), payload: { accountStatus: 'SUSPENDED' } })
  assert.equal(stopSecondary.statusCode, 200, stopSecondary.body)
  const stopPrimary = await app.inject({ method: 'PATCH', url: `/api/admin/users/${primary.id}`,
    headers: auth(adminToken), payload: { accountStatus: 'SUSPENDED' } })
  assert.equal(stopPrimary.statusCode, 403)

  // Revoking sessions invalidates an already-issued admin access token.
  const revoke = await app.inject({ method: 'POST', url: `/api/admin/users/${finance.id}/revoke-sessions`, headers: auth(adminToken) })
  assert.equal(revoke.statusCode, 200, revoke.body)
  assert.equal((await app.inject({ method: 'GET', url: '/api/auth/session', headers: auth(financeToken) })).statusCode, 401)

  // Suspension also invalidates the old access token without deleting account history.
  assert.equal((await app.inject({ method: 'GET', url: '/api/auth/session', headers: auth(secondaryToken) })).statusCode, 401)
})

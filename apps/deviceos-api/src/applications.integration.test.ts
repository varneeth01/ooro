import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { app } from './server.js'
import { prisma } from './prisma.js'
import { issueTokens } from './http.js'

const databaseUrl = process.env.DATABASE_URL ?? ''
const enabled = process.env.OORO_DEVICEOS_APPLICATIONS_INTEGRATION_TESTS === 'true'
  && /@127\.0\.0\.1:55432\/ooro_test(?:\?|$)/.test(databaseUrl)

test('DeviceOS service applications GET is authorized and returns an empty registry', { skip: !enabled }, async () => {
  const superAdmin = await prisma.user.create({ data: { phone: `deviceos-apps-super-${randomUUID()}`, role: 'SUPER_ADMIN', accountStatus: 'ACTIVE' } })
  const driver = await prisma.user.create({ data: { phone: `deviceos-apps-driver-${randomUUID()}`, role: 'DRIVER', accountStatus: 'ACTIVE' } })
  const { accessToken: superAdminToken } = await issueTokens(superAdmin.id, superAdmin.role)
  const { accessToken: driverToken } = await issueTokens(driver.id, driver.role)

  try {
    const anonymous = await app.inject({ method: 'GET', url: '/api/admin/deviceos/applications' })
    assert.equal(anonymous.statusCode, 401, anonymous.body)

    const forbidden = await app.inject({ method: 'GET', url: '/api/admin/deviceos/applications', headers: { authorization: `Bearer ${driverToken}` } })
    assert.equal(forbidden.statusCode, 403, forbidden.body)

    const response = await app.inject({ method: 'GET', url: '/api/admin/deviceos/applications', headers: { authorization: `Bearer ${superAdminToken}` } })
    assert.equal(response.statusCode, 200, response.body)
    assert.deepEqual(response.json().data, [])
  } finally {
    await app.close()
    await prisma.$disconnect()
  }
})

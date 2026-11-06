import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { app } from './server.js'
import { prisma } from './prisma.js'
import { issueTokens } from './http.js'
import { standardV3Draft } from './domain/layout-studio.js'

const enabled = process.env.OORO_LAYOUT_STUDIO_INTEGRATION_TESTS === 'true'
  && /@127\.0\.0\.1:55432\/ooro_test(?:\?|$)/.test(process.env.DATABASE_URL ?? '')

test('Layout Studio persists drafts, enforces Super Admin publication and keeps assignment disabled', { skip: !enabled }, async () => {
  const suffix = randomUUID()
  const superAdmin = await prisma.user.create({ data: { phone: `layout-super-${suffix}`, role: 'SUPER_ADMIN', accountStatus: 'ACTIVE' } })
  const admin = await prisma.user.create({ data: { phone: `layout-admin-${suffix}`, role: 'ADMIN', accountStatus: 'ACTIVE' } })
  const superToken = (await issueTokens(superAdmin.id, superAdmin.role)).accessToken
  const adminToken = (await issueTokens(admin.id, admin.role)).accessToken
  const superHeaders = { authorization: `Bearer ${superToken}` }
  const adminHeaders = { authorization: `Bearer ${adminToken}` }
  const draft = standardV3Draft()
  try {
    const created = await app.inject({ method: 'POST', url: '/api/admin/layout-studio', headers: superHeaders, payload: { name: `Disposable ${suffix}`, contract: draft } })
    assert.equal(created.statusCode, 201, created.body)
    const id = created.json().data.id as string
    const save = await app.inject({ method: 'PUT', url: `/api/admin/layout-studio/${id}/draft`, headers: superHeaders, payload: { expectedRowVersion: 1, name: `Disposable ${suffix} edited`, contract: draft } })
    assert.equal(save.statusCode, 200, save.body)
    assert.equal(save.json().data.rowVersion, 2)
    const stale = await app.inject({ method: 'PUT', url: `/api/admin/layout-studio/${id}/draft`, headers: superHeaders, payload: { expectedRowVersion: 1, name: 'stale', contract: draft } })
    assert.equal(stale.statusCode, 409)
    const adminPublish = await app.inject({ method: 'POST', url: `/api/admin/layout-studio/${id}/publish`, headers: adminHeaders, payload: { expectedRowVersion: 2 } })
    assert.equal(adminPublish.statusCode, 403)
    const validated = await app.inject({ method: 'POST', url: `/api/admin/layout-studio/${id}/validate`, headers: superHeaders, payload: { expectedRowVersion: 2 } })
    assert.equal(validated.statusCode, 200, validated.body)
    assert.equal(validated.json().data.valid, true)
    const published = await app.inject({ method: 'POST', url: `/api/admin/layout-studio/${id}/publish`, headers: superHeaders, payload: { expectedRowVersion: validated.json().data.rowVersion } })
    assert.equal(published.statusCode, 201, published.body)
    const assignment = await app.inject({ method: 'POST', url: `/api/admin/layout-studio/${id}/assign`, headers: superHeaders, payload: { displayId: randomUUID() } })
    assert.equal(assignment.statusCode, 409)
    assert.equal(assignment.json().error.code, 'LAYOUT_ASSIGNMENT_DISABLED')
  } finally {
    await app.close()
    await prisma.$disconnect()
  }
})

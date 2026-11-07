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
    const alteredStandard = structuredClone(draft)
    alteredStandard.zones[0]!.geometry.width = 0.79
    const rejectedStandardCreate = await app.inject({ method: 'POST', url: '/api/admin/layout-studio', headers: superHeaders, payload: { name: `Invalid Standard ${suffix}`, contract: alteredStandard } })
    assert.equal(rejectedStandardCreate.statusCode, 422)
    const rejectedStandardUpdate = await app.inject({ method: 'PUT', url: `/api/admin/layout-studio/${id}/draft`, headers: superHeaders, payload: { expectedRowVersion: 2, name: 'Altered Standard', contract: alteredStandard } })
    assert.equal(rejectedStandardUpdate.statusCode, 422)
    const unchangedStandard = await app.inject({ method: 'GET', url: `/api/admin/layout-studio/${id}`, headers: superHeaders })
    assert.equal(unchangedStandard.json().data.draftContract.zones[0].geometry.width, 0.8)
    assert.equal(unchangedStandard.json().data.rowVersion, 2)
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

    const customDraft = {
      ...standardV3Draft(),
      mode: 'CUSTOM' as const,
      preset: 'CUSTOM_CANVAS' as const,
      profileId: 'OORO_PREMIUM' as const,
      zones: [{
        id: 'custom-image', type: 'IMAGE' as const, label: 'Custom media', schemaVersion: 1 as const,
        geometry: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, zIndex: 0,
        fit: 'FIT' as const, contentBinding: { kind: 'NONE' as const }, visible: true,
      }],
    }
    const customCreated = await app.inject({ method: 'POST', url: '/api/admin/layout-studio', headers: superHeaders, payload: { name: `Uncertified draft ${suffix}`, contract: customDraft } })
    assert.equal(customCreated.statusCode, 201, customCreated.body)
    const customId = customCreated.json().data.id as string
    const customValidation = await app.inject({ method: 'POST', url: `/api/admin/layout-studio/${customId}/validate`, headers: superHeaders, payload: { expectedRowVersion: 1 } })
    assert.equal(customValidation.statusCode, 200, customValidation.body)
    assert.equal(customValidation.json().data.valid, false)
    assert.ok(customValidation.json().data.issues.some((issue: { code: string }) => issue.code === 'CAPABILITY_PROFILE_UNVERIFIED'))
    const customSave = await app.inject({ method: 'PUT', url: `/api/admin/layout-studio/${customId}/draft`, headers: superHeaders, payload: { expectedRowVersion: 1, name: `Uncertified draft saved ${suffix}`, contract: customDraft } })
    assert.equal(customSave.statusCode, 200, customSave.body)
    assert.equal(customSave.json().data.rowVersion, 2)
  } finally {
    await app.close()
    await prisma.$disconnect()
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { app } from './server.js'
import { prisma } from './prisma.js'
import { issueTokens } from './http.js'
import { inspectApk } from './domain/apk-release.js'
import { deviceOsStorage } from './domain/deviceos-storage.js'

const databaseUrl = process.env.DATABASE_URL ?? ''
const apkPath = process.env.DEVICEOS_TEST_APK_PATH
const enabled = process.env.OORO_DEVICEOS_RELEASE_INTEGRATION_TESTS === 'true'
  && /ooro_test/.test(databaseUrl)
  && (/host=\/tmp\/ooro-deviceos-/.test(databaseUrl) || (process.env.OORO_DEVICEOS_ALLOW_DISPOSABLE_TCP_DB === 'true' && /@127\.0\.0\.1:\d+\//.test(databaseUrl)))
  && Boolean(apkPath)

test('DeviceOS release integration: inspect, upload, approve, and deduplicate a real APK', { skip: !enabled }, async () => {
  const content = await readFile(apkPath!)
  const metadata = await inspectApk(content)
  const admin = await prisma.user.create({ data: { phone: `deviceos-release-${randomUUID()}`, role: 'ADMIN', accountStatus: 'ACTIVE' } })
  const { accessToken } = await issueTokens(admin.id, admin.role)
  const headers = { authorization: `Bearer ${accessToken}` }
  let applicationId: string | undefined
  let mismatchApplicationId: string | undefined
  let releaseId: string | undefined
  let storageKey: string | undefined
  try {
    const registered = await app.inject({ method: 'POST', url: '/api/admin/deviceos/applications', headers, payload: { packageName: metadata.packageName, displayName: metadata.label ?? metadata.packageName } })
    assert.equal(registered.statusCode, 200, registered.body)
    applicationId = registered.json().data.id
    const apkBase64 = content.toString('base64')
    const uploaded = await app.inject({ method: 'POST', url: `/api/admin/deviceos/applications/${applicationId}/releases`, headers, payload: { apkBase64 } })
    assert.equal(uploaded.statusCode, 200, uploaded.body)
    assert.equal(uploaded.json().data.packageName, metadata.packageName)
    releaseId = uploaded.json().data.id
    storageKey = uploaded.json().data.storageKey

    const approved = await app.inject({ method: 'POST', url: `/api/admin/deviceos/releases/${releaseId}/approve`, headers, payload: {} })
    assert.equal(approved.statusCode, 200, approved.body)
    assert.equal(approved.json().data.approvalStatus, 'APPROVED')

    const duplicate = await app.inject({ method: 'POST', url: `/api/admin/deviceos/applications/${applicationId}/releases`, headers, payload: { apkBase64 } })
    assert.equal(duplicate.statusCode, 200, duplicate.body)
    assert.equal(duplicate.json().data.duplicate, true)
    assert.equal(duplicate.json().data.release.id, releaseId)
    await deviceOsStorage().get(storageKey!)

    const mismatch = await app.inject({ method: 'POST', url: '/api/admin/deviceos/applications', headers, payload: { packageName: `${metadata.packageName}.mismatch`, displayName: 'Mismatched package test' } })
    assert.equal(mismatch.statusCode, 200, mismatch.body)
    mismatchApplicationId = mismatch.json().data.id
    const wrongPackage = await app.inject({ method: 'POST', url: `/api/admin/deviceos/applications/${mismatchApplicationId}/releases`, headers, payload: { apkBase64 } })
    assert.equal(wrongPackage.statusCode, 422, wrongPackage.body)
  } finally {
    if (releaseId) await prisma.applicationRelease.deleteMany({ where: { id: releaseId } })
    if (storageKey) await deviceOsStorage().delete(storageKey).catch(() => undefined)
    if (applicationId) await prisma.managedApplication.deleteMany({ where: { id: applicationId } })
    if (mismatchApplicationId) await prisma.managedApplication.deleteMany({ where: { id: mismatchApplicationId } })
    await prisma.user.delete({ where: { id: admin.id } })
  }
})

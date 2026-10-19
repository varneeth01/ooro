import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { app } from './server.js'
import { prisma } from './prisma.js'
import { hashSecret, issueTokens } from './http.js'

const databaseUrl = process.env.DATABASE_URL ?? ''
const enabled = process.env.OORO_DEVICEOS_INTEGRATION_TESTS === 'true'
  && /ooro_test/.test(databaseUrl)
  && (/host=\/tmp\/ooro-deviceos-/.test(databaseUrl) || (process.env.OORO_DEVICEOS_ALLOW_DISPOSABLE_TCP_DB === 'true' && /@127\.0\.0\.1:\d+\//.test(databaseUrl)))

test('DeviceOS PostgreSQL integration: enrollment, scoping, authorization, and revocation', { skip: !enabled }, async () => {
  const admin = await prisma.user.create({ data: { phone: `deviceos-admin-${randomUUID()}`, role: 'ADMIN', accountStatus: 'ACTIVE' } })
  const support = await prisma.user.create({ data: { phone: `deviceos-support-${randomUUID()}`, role: 'SUPPORT', accountStatus: 'ACTIVE' } })
  const { accessToken: adminToken } = await issueTokens(admin.id, admin.role)
  const { accessToken: supportToken } = await issueTokens(support.id, support.role)
  const displayOne = await prisma.display.create({ data: { deviceId: `deviceos-${randomUUID()}`, name: 'DeviceOS integration one', state: 'READY' } })
  const displayTwo = await prisma.display.create({ data: { deviceId: `deviceos-${randomUUID()}`, name: 'DeviceOS integration two', state: 'READY' } })
  const pairingOne = 'DEVICEOS-ONE'
  const pairingTwo = 'DEVICEOS-TWO'
  await prisma.displayPairingCode.createMany({ data: [
    { displayId: displayOne.id, codeHash: hashSecret(pairingOne), codeLast4: pairingOne.slice(-4), expiresAt: new Date(Date.now() + 60_000) },
    { displayId: displayTwo.id, codeHash: hashSecret(pairingTwo), codeLast4: pairingTwo.slice(-4), expiresAt: new Date(Date.now() + 60_000) },
  ] })
  const adminHeaders = { authorization: `Bearer ${adminToken}` }
  const supportHeaders = { authorization: `Bearer ${supportToken}` }
  const enrolledOne = await app.inject({ method: 'POST', url: '/api/deviceos/enroll', payload: { pairingCode: pairingOne, agentVersionName: 'test', agentVersionCode: 1 } })
  const enrolledTwo = await app.inject({ method: 'POST', url: '/api/deviceos/enroll', payload: { pairingCode: pairingTwo, agentVersionName: 'test', agentVersionCode: 1 } })
  assert.equal(enrolledOne.statusCode, 200, enrolledOne.body)
  assert.equal(enrolledTwo.statusCode, 200, enrolledTwo.body)
  const deviceOne = enrolledOne.json().data
  const deviceTwo = enrolledTwo.json().data
  const deviceOneHeaders = { authorization: `Bearer ${deviceOne.deviceToken}` }
  const deviceTwoHeaders = { authorization: `Bearer ${deviceTwo.deviceToken}` }
  let applicationId: string | undefined

  try {
    const replay = await app.inject({ method: 'POST', url: '/api/deviceos/enroll', payload: { pairingCode: pairingOne } })
    assert.equal(replay.statusCode, 400)

    const unauthorizedRegister = await app.inject({ method: 'POST', url: '/api/admin/deviceos/applications', headers: supportHeaders, payload: { packageName: 'com.ooro.integration', displayName: 'Integration app' } })
    assert.equal(unauthorizedRegister.statusCode, 403)
    const registered = await app.inject({ method: 'POST', url: '/api/admin/deviceos/applications', headers: adminHeaders, payload: { packageName: 'com.ooro.integration', displayName: 'Integration app' } })
    assert.equal(registered.statusCode, 200, registered.body)
    const registeredApplicationId = registered.json().data.id as string
    applicationId = registeredApplicationId

    const release = await prisma.applicationRelease.create({ data: { applicationId: registeredApplicationId, packageName: 'com.ooro.integration', versionCode: 1, versionName: '1.0.0', minSdk: 26, targetSdk: 35, sha256: 'ab'.repeat(32), certificateSha256: 'cd'.repeat(32), storageKey: `deviceos-test-${randomUUID()}.apk`, sizeBytes: 4, approvalStatus: 'APPROVED' } })
    const campaign = await prisma.deploymentCampaign.create({ data: { name: 'DeviceOS integration campaign', applicationId: registeredApplicationId, releaseId: release.id, state: 'ACTIVE', targetingMode: 'DEVICES', cohortSeed: randomUUID(), createdBy: admin.id } })
    await prisma.deploymentTarget.create({ data: { campaignId: campaign.id, managedDeviceId: deviceTwo.managedDeviceId, state: 'ASSIGNED', assignedAt: new Date(), attempts: { create: { managedDeviceId: deviceTwo.managedDeviceId, attemptNumber: 1, state: 'ASSIGNED', idempotencyKey: `${campaign.id}:attempt-1` } } } })
    const deploymentPayload = { name: 'DeviceOS integration versioned campaign', applicationId: registeredApplicationId, releaseId: release.id, targetingMode: 'DEVICES', deviceIds: [deviceTwo.managedDeviceId] }
    const deploymentKey = randomUUID()
    const createdDeployment = await app.inject({ method: 'POST', url: '/api/admin/deviceos/deployments', headers: { ...adminHeaders, 'idempotency-key': deploymentKey }, payload: deploymentPayload })
    assert.equal(createdDeployment.statusCode, 200, createdDeployment.body)
    const repeatedDeployment = await app.inject({ method: 'POST', url: '/api/admin/deviceos/deployments', headers: { ...adminHeaders, 'idempotency-key': deploymentKey }, payload: deploymentPayload })
    assert.equal(repeatedDeployment.statusCode, 200, repeatedDeployment.body)
    assert.equal(repeatedDeployment.json().data.campaign.id, createdDeployment.json().data.campaign.id)
    const conflictingDeployment = await app.inject({ method: 'POST', url: '/api/admin/deviceos/deployments', headers: { ...adminHeaders, 'idempotency-key': deploymentKey }, payload: { ...deploymentPayload, deviceIds: [deviceOne.managedDeviceId] } })
    assert.equal(conflictingDeployment.statusCode, 409, conflictingDeployment.body)
    const versionedCampaignId = createdDeployment.json().data.campaign.id as string
    const versionedState = await app.inject({ method: 'GET', url: '/api/deviceos/state', headers: deviceTwoHeaders })
    assert.equal(versionedState.statusCode, 200, versionedState.body)
    assert.equal(versionedState.json().data.desiredStateVersion, 1)
    const paused = await app.inject({ method: 'POST', url: `/api/admin/deviceos/deployments/${versionedCampaignId}/pause`, headers: adminHeaders, payload: { reason: 'Integration pause' } })
    assert.equal(paused.statusCode, 200, paused.body)
    const repeatedPause = await app.inject({ method: 'POST', url: `/api/admin/deviceos/deployments/${versionedCampaignId}/pause`, headers: adminHeaders, payload: { reason: 'Repeated integration pause' } })
    assert.equal(repeatedPause.statusCode, 200, repeatedPause.body)
    const pausedState = await app.inject({ method: 'GET', url: '/api/deviceos/state', headers: deviceTwoHeaders })
    assert.equal(pausedState.json().data.desiredStateVersion, 2)
    const resumed = await app.inject({ method: 'POST', url: `/api/admin/deviceos/deployments/${versionedCampaignId}/resume`, headers: adminHeaders, payload: {} })
    assert.equal(resumed.statusCode, 200, resumed.body)
    const resumedState = await app.inject({ method: 'GET', url: '/api/deviceos/state', headers: deviceTwoHeaders })
    assert.equal(resumedState.json().data.desiredStateVersion, 3)

    const ownState = await app.inject({ method: 'GET', url: '/api/deviceos/state', headers: deviceOneHeaders })
    const assignedState = await app.inject({ method: 'GET', url: '/api/deviceos/state', headers: deviceTwoHeaders })
    assert.equal(ownState.statusCode, 200, ownState.body)
    assert.equal(assignedState.statusCode, 200, assignedState.body)
    assert.equal(ownState.json().data.targets.length, 0)
    assert.equal(assignedState.json().data.targets.length, 2)
    assert.equal('storageKey' in assignedState.json().data.targets[0].campaign.release, false)
    assert.equal('approvedBy' in assignedState.json().data.targets[0].campaign.release, false)

    const unauthorizedAllowlistChange = await app.inject({ method: 'POST', url: `/api/admin/deviceos/applications/${registeredApplicationId}/allowlist`, headers: supportHeaders, payload: { allowed: false } })
    assert.equal(unauthorizedAllowlistChange.statusCode, 403)
    const blocked = await app.inject({ method: 'POST', url: `/api/admin/deviceos/applications/${registeredApplicationId}/allowlist`, headers: adminHeaders, payload: { allowed: false } })
    assert.equal(blocked.statusCode, 200, blocked.body)
    const blockedState = await app.inject({ method: 'GET', url: '/api/deviceos/state', headers: deviceTwoHeaders })
    assert.equal(blockedState.statusCode, 200, blockedState.body)
    assert.equal(blockedState.json().data.targets.length, 0)
    const blockedDownload = await app.inject({ method: 'GET', url: `/api/deviceos/releases/${release.id}/download-url`, headers: deviceTwoHeaders })
    assert.equal(blockedDownload.statusCode, 403, blockedDownload.body)
    const reallowed = await app.inject({ method: 'POST', url: `/api/admin/deviceos/applications/${registeredApplicationId}/allowlist`, headers: adminHeaders, payload: { allowed: true } })
    assert.equal(reallowed.statusCode, 200, reallowed.body)
    const reallowedState = await app.inject({ method: 'GET', url: '/api/deviceos/state', headers: deviceTwoHeaders })
    assert.equal(reallowedState.json().data.targets.length, 2)

    const eventTargetId = assignedState.json().data.targets[0].id as string
    const reportEvent = async (state: string, fields: Record<string, unknown> = {}) => app.inject({ method: 'POST', url: `/api/deviceos/targets/${eventTargetId}/events`, headers: deviceTwoHeaders, payload: { state, idempotencyKey: `integration-event-${state.toLowerCase()}-${randomUUID()}`, ...fields } })
    assert.equal((await reportEvent('DOWNLOADING')).statusCode, 200)
    const downloaded = await reportEvent('DOWNLOADED', { bytesDownloaded: 4 })
    assert.equal(downloaded.statusCode, 200, downloaded.body)
    assert.equal((await reportEvent('VERIFIED', { checksumVerified: true })).statusCode, 200)
    assert.equal((await reportEvent('INSTALLING', { installerSessionId: 'integration-session', installerStatus: 'PENDING' })).statusCode, 200)
    assert.equal((await reportEvent('PENDING_USER_ACTION', { installerStatus: 'PENDING_USER_ACTION', installerMessage: 'Confirmation required' })).statusCode, 200)
    assert.equal((await reportEvent('INSTALLING', { installerSessionId: 'integration-session', installerStatus: 'RESUMED' })).statusCode, 200)
    assert.equal((await reportEvent('INSTALLED', { installerStatus: 'SUCCESS', installedVersionCode: 1, installedVersionName: '1.0.0' })).statusCode, 200)
    assert.equal((await reportEvent('HEALTH_CHECK')).statusCode, 200)
    const healthyEvent = await reportEvent('HEALTHY', { healthStatus: 'HEALTHY', installedVersionCode: 1, installedVersionName: '1.0.0', installedCertificateSha256: 'cd'.repeat(32) })
    assert.equal(healthyEvent.statusCode, 200, healthyEvent.body)
    const duplicateEventKey = `integration-duplicate-${randomUUID()}`
    const duplicatePayload = { state: 'DOWNLOADING', idempotencyKey: duplicateEventKey }
    const duplicateFirst = await app.inject({ method: 'POST', url: `/api/deviceos/targets/${assignedState.json().data.targets[1].id}/events`, headers: deviceTwoHeaders, payload: duplicatePayload })
    const duplicateSecond = await app.inject({ method: 'POST', url: `/api/deviceos/targets/${assignedState.json().data.targets[1].id}/events`, headers: deviceTwoHeaders, payload: duplicatePayload })
    assert.equal(duplicateFirst.statusCode, 200, duplicateFirst.body)
    assert.equal(duplicateSecond.statusCode, 200, duplicateSecond.body)

    await prisma.deviceCredential.updateMany({ where: { managedDeviceId: deviceOne.managedDeviceId, revokedAt: null }, data: { expiresAt: new Date(Date.now() - 1_000) } })
    const expiredState = await app.inject({ method: 'GET', url: '/api/deviceos/state', headers: deviceOneHeaders })
    assert.equal(expiredState.statusCode, 401)

    const heartbeatRequestId = randomUUID()
    const heartbeatPayload = { requestId: heartbeatRequestId, inventory: [{ packageName: 'com.ooro.integration', versionCode: 1, certificateSha256: 'cd'.repeat(32) }], telemetry: { observationMode: true } }
    const heartbeat = await app.inject({ method: 'POST', url: '/api/deviceos/heartbeat', headers: deviceTwoHeaders, payload: heartbeatPayload })
    assert.equal(heartbeat.statusCode, 200, heartbeat.body)
    assert.equal(heartbeat.json().data.replayed, false)
    const heartbeatReplay = await app.inject({ method: 'POST', url: '/api/deviceos/heartbeat', headers: deviceTwoHeaders, payload: heartbeatPayload })
    assert.equal(heartbeatReplay.statusCode, 200, heartbeatReplay.body)
    assert.equal(heartbeatReplay.json().data.replayed, true)
    const rotationRequestId = randomUUID()
    const rotated = await app.inject({ method: 'POST', url: '/api/deviceos/rotate-credential', headers: deviceTwoHeaders, payload: { requestId: rotationRequestId } })
    assert.equal(rotated.statusCode, 200, rotated.body)
    const rotatedHeaders = { authorization: `Bearer ${rotated.json().data.deviceToken}` }
    const rotationReplay = await app.inject({ method: 'POST', url: '/api/deviceos/rotate-credential', headers: rotatedHeaders, payload: { requestId: rotationRequestId } })
    assert.equal(rotationReplay.statusCode, 409, rotationReplay.body)
    const revoke = await app.inject({ method: 'POST', url: `/api/admin/deviceos/devices/${deviceTwo.managedDeviceId}/revoke`, headers: adminHeaders, payload: {} })
    assert.equal(revoke.statusCode, 200, revoke.body)
    const revokedState = await app.inject({ method: 'GET', url: '/api/deviceos/state', headers: deviceTwoHeaders })
    assert.equal(revokedState.statusCode, 401)
  } finally {
    await prisma.deploymentCampaign.deleteMany({ where: { id: { in: await prisma.deploymentCampaign.findMany({ where: { name: { startsWith: 'DeviceOS integration' } }, select: { id: true } }).then(rows => rows.map(row => row.id)) } } })
    if (applicationId) await prisma.applicationRelease.deleteMany({ where: { applicationId } })
    await prisma.managedDevice.deleteMany({ where: { id: { in: [deviceOne.managedDeviceId, deviceTwo.managedDeviceId] } } })
    await prisma.display.deleteMany({ where: { id: { in: [displayOne.id, displayTwo.id] } } })
    await prisma.managedApplication.deleteMany({ where: { packageName: 'com.ooro.integration' } })
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, support.id] } } })
  }
})

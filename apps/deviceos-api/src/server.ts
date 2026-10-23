/* eslint-disable @typescript-eslint/no-explicit-any */
import Fastify from 'fastify'
import { Prisma } from '@prisma/client'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { config } from './config.js'
import { prisma } from './prisma.js'
import { ApiError, forbidden, notFound, unauthorized } from './errors.js'
import { authenticateDeviceOs, hashSecret, randomSecret, requireRoles, response } from './http.js'
import { adminRoles, deviceOsWriteRoles } from './domain/admin-auth.js'
import { asDeviceOsJson } from './domain/deviceos-http.js'
import { assertSigningCertificateContinuity, decodeApkBase64, inspectApk } from './domain/apk-release.js'
import { deviceOsStorage, parseDeviceOsRange, sliceDeviceOsContent, verifyLocalDownloadSignature } from './domain/deviceos-storage.js'
import { campaignHealthGate, createDeviceOsCampaign, deploymentTargetingModes, isWithinMaintenanceWindow, pauseDeviceOsCampaign, resumeDeviceOsCampaign } from './domain/deviceos-deployment.js'
import { isHealthyInstallationReportValid, retryDelayMs, validateDeviceOsEventTransition } from './domain/deviceos.js'


const app = Fastify({ logger: true })
const deviceOsUploadBodyLimit = Math.ceil(config.deviceOsMaxApkBytes * 4 / 3) + 1024 * 1024
app.register(cors, { origin: config.corsOrigins })
app.register(helmet)
app.addHook('onRequest', async (request) => {
  request.log.info({ requestPath: request.raw.url?.split('?')[0] ?? request.url.split('?')[0] }, 'requestPath')
})
app.removeContentTypeParser('application/json')
app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
  try { (request as any).rawBody = body; done(null, JSON.parse(body as string)) } catch (error) { done(error as Error, undefined) }
})
app.addHook('preHandler', async (request) => {
  if (request.url.split('?')[0].startsWith('/api/admin/')) await requireRoles(request, adminRoles)
})

const ok = (request: any, data: unknown, reply: any) => reply.send(response(request, data))
const sendDeviceOsApk = (request: any, reply: any, content: Buffer, filename?: string) => {
  const range = parseDeviceOsRange(typeof request.headers.range === 'string' ? request.headers.range : undefined, content.length)
  const common = reply.header('content-type', 'application/vnd.android.package-archive').header('accept-ranges', 'bytes').header('content-disposition', filename ? `attachment; filename="${filename.replace(/"/g, '')}"` : 'attachment')
  if (range === null) return common.header('content-length', content.length).send(content)
  if (range === 'INVALID') return reply.code(416).header('content-range', `bytes */${content.length}`).send()
  const { start, end } = range
  return common.code(206).header('content-length', end - start + 1).header('content-range', `bytes ${start}-${end}/${content.length}`).send(sliceDeviceOsContent(content, { start, end }))
}
const bodyOf = <T>(request: any, schema: z.ZodType<T>) => {
  const parsed = schema.safeParse(request.body)
  if (!parsed.success) throw new ApiError('VALIDATION_ERROR', parsed.error.issues.map((issue) => issue.message).join('; '), 422)
  return parsed.data
}
const deviceRequestId = z.string().uuid()
const consumeDeviceRequest = async (tx: Prisma.TransactionClient, managedDeviceId: string, requestId: string, endpoint: string) => {
  try {
    await tx.deviceRequestReceipt.create({ data: { managedDeviceId, requestId, endpoint } })
    await tx.deviceRequestReceipt.deleteMany({ where: { managedDeviceId, receivedAt: { lt: new Date(Date.now() - Math.max(1, config.deviceOsRequestReceiptRetentionDays) * 24 * 60 * 60 * 1000) } } })
    return true
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false
    throw error
  }
}
app.post('/api/deviceos/enroll', async (request, reply) => {
  const input = bodyOf(request, z.object({
    pairingCode: z.string().trim().min(6).max(32),
    agentVersionName: z.string().trim().max(80).optional(),
    agentVersionCode: z.coerce.bigint().nonnegative().optional(),
    androidVersion: z.string().trim().max(80).optional(),
    manufacturer: z.string().trim().max(120).optional(),
    model: z.string().trim().max(120).optional(),
    capabilities: z.record(z.string(), z.unknown()).optional(),
  }))
  const now = new Date()
  const pairing = await prisma.displayPairingCode.findFirst({ where: { codeHash: hashSecret(input.pairingCode.toUpperCase()), consumedAt: null, revokedAt: null, expiresAt: { gt: now } }, select: { id: true, displayId: true } })
  if (!pairing) throw new ApiError('INVALID_PAIRING_CODE', 'Pairing code is invalid or expired', 400)
  const token = randomSecret()
  const credentialId = randomUUID()
  const managedDevice = await prisma.$transaction(async (tx) => {
    const consumed = await tx.displayPairingCode.updateMany({ where: { id: pairing.id, consumedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } })
    if (consumed.count !== 1) throw new ApiError('PAIRING_CODE_ALREADY_USED', 'Pairing code is no longer available', 409)
    const device = await tx.managedDevice.upsert({
      where: { displayId: pairing.displayId },
      create: { displayId: pairing.displayId, enrollmentStatus: 'ENROLLED', agentVersionName: input.agentVersionName, agentVersionCode: input.agentVersionCode, androidVersion: input.androidVersion, manufacturer: input.manufacturer, model: input.model, capabilities: input.capabilities as any, lastSeenAt: now },
      update: { enrollmentStatus: 'ENROLLED', revokedAt: null, agentVersionName: input.agentVersionName, agentVersionCode: input.agentVersionCode, androidVersion: input.androidVersion, manufacturer: input.manufacturer, model: input.model, capabilities: input.capabilities as any, lastSeenAt: now, rowVersion: { increment: 1 } },
    })
    await tx.deviceCredential.updateMany({ where: { managedDeviceId: device.id, revokedAt: null }, data: { revokedAt: now } })
    await tx.deviceCredential.create({ data: { managedDeviceId: device.id, credentialId, tokenHash: hashSecret(token) } })
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, action: 'DEVICE_ENROLLED', entityType: 'ManagedDevice', entityId: device.id, after: { displayId: device.displayId, agentVersionName: input.agentVersionName, agentVersionCode: input.agentVersionCode?.toString() } as any, requestId: request.id } })
    return device
  })
  return ok(request, { managedDeviceId: managedDevice.id, displayId: managedDevice.displayId, credentialId, deviceToken: token, enrollmentStatus: managedDevice.enrollmentStatus }, reply)
})

app.get('/api/deviceos/state', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const targets = await prisma.deploymentTarget.findMany({ where: { managedDeviceId: device.id, campaign: { application: { allowed: true } }, state: { in: ['PENDING', 'ASSIGNED', 'DOWNLOADING', 'DOWNLOADED', 'VERIFIED', 'INSTALLING', 'PENDING_USER_ACTION', 'INSTALLED', 'HEALTH_CHECK', 'FAILED', 'RETRY_WAIT'] } }, include: { campaign: { include: { application: { select: { id: true, packageName: true, displayName: true } }, release: { select: { id: true, packageName: true, versionCode: true, versionName: true, minSdk: true, targetSdk: true, sha256: true, certificateSha256: true, sizeBytes: true } } } } }, orderBy: { createdAt: 'asc' }, take: 20 })
  const deviceTargets = targets.map((target) => ({
    id: target.id,
    state: target.state,
    attemptCount: target.attemptCount,
    nextAttemptAt: target.nextAttemptAt,
    campaign: {
      id: target.campaign.id,
      name: target.campaign.name,
      state: target.campaign.state,
      maintenanceWindowStart: target.campaign.maintenanceWindowStart,
      maintenanceWindowEnd: target.campaign.maintenanceWindowEnd,
      application: target.campaign.application,
      release: target.campaign.release,
    },
  }))
  return ok(request, asDeviceOsJson({ managedDeviceId: device.id, displayId: device.displayId, enrollmentStatus: device.enrollmentStatus, desiredStateVersion: device.desiredStateVersion, targets: deviceTargets }), reply)
})

app.post('/api/deviceos/heartbeat', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const input = bodyOf(request, z.object({
    requestId: deviceRequestId,
    agentVersionName: z.string().max(80).optional(),
    agentVersionCode: z.coerce.bigint().nonnegative().optional(),
    androidVersion: z.string().max(80).optional(),
    manufacturer: z.string().max(120).optional(),
    model: z.string().max(120).optional(),
    capabilities: z.record(z.string(), z.unknown()).optional(),
    inventory: z.array(z.object({ packageName: z.string().min(1).max(255), versionCode: z.coerce.bigint().nonnegative(), versionName: z.string().max(255).optional(), certificateSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(), installSource: z.string().max(80).optional(), metadata: z.record(z.string(), z.unknown()).optional() })).max(500).default([]),
    telemetry: z.record(z.string(), z.unknown()).optional(),
  }))
  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const isNewRequest = await consumeDeviceRequest(tx, device.id, input.requestId, '/api/deviceos/heartbeat')
    if (!isNewRequest) return { replayed: true, device: { id: device.id, desiredStateVersion: device.desiredStateVersion } }
    const current = await tx.managedDevice.findUnique({ where: { id: device.id } })
    if (!current || current.revokedAt || current.enrollmentStatus === 'REVOKED') throw unauthorized('DeviceOS device is revoked')
    const result = await tx.managedDevice.update({ where: { id: device.id, rowVersion: current.rowVersion }, data: { lastSeenAt: now, agentVersionName: input.agentVersionName, agentVersionCode: input.agentVersionCode, androidVersion: input.androidVersion, manufacturer: input.manufacturer, model: input.model, capabilities: { ...(input.capabilities ?? {}), telemetry: input.telemetry ?? {} } as any, rowVersion: { increment: 1 } } })
    for (const item of input.inventory) {
      const app = await tx.managedApplication.findUnique({ where: { packageName: item.packageName }, select: { id: true, allowed: true, releases: { where: { approvalStatus: 'APPROVED' }, orderBy: { versionCode: 'desc' }, take: 1, select: { versionCode: true, certificateSha256: true } } } })
      const latestRelease = app?.releases[0]
      const isCompliant = Boolean(app?.allowed && latestRelease && item.versionCode >= latestRelease.versionCode && item.certificateSha256?.toLowerCase() === latestRelease.certificateSha256.toLowerCase())
      await tx.deviceApplicationInventory.upsert({ where: { managedDeviceId_packageName: { managedDeviceId: device.id, packageName: item.packageName } }, create: { managedDeviceId: device.id, applicationId: app?.id, packageName: item.packageName, versionCode: item.versionCode, versionName: item.versionName, certificateSha256: item.certificateSha256?.toLowerCase(), installSource: item.installSource, isCompliant, metadata: item.metadata as any }, update: { applicationId: app?.id, versionCode: item.versionCode, versionName: item.versionName, certificateSha256: item.certificateSha256?.toLowerCase(), installSource: item.installSource, isCompliant, metadata: item.metadata as any, lastSeenAt: now } })
    }
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, action: 'DEVICE_HEARTBEAT', entityType: 'ManagedDevice', entityId: device.id, after: { inventoryCount: input.inventory.length, receivedAt: now.toISOString() } as any, requestId: request.id } })
    return { replayed: false, device: result }
  }).catch((error) => { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new ApiError('DEVICE_STATE_CONFLICT', 'Device state changed concurrently; retry heartbeat', 409); throw error })
  return ok(request, asDeviceOsJson({ accepted: true, replayed: updated.replayed, managedDeviceId: updated.device.id, desiredStateVersion: updated.device.desiredStateVersion, serverTime: now }), reply)
})

app.post('/api/deviceos/revoke', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.managedDevice.update({ where: { id: device.id }, data: { enrollmentStatus: 'REVOKED', revokedAt: now, rowVersion: { increment: 1 } } })
    await tx.deviceCredential.updateMany({ where: { managedDeviceId: device.id, revokedAt: null }, data: { revokedAt: now } })
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, action: 'DEVICE_SELF_REVOCATION', entityType: 'ManagedDevice', entityId: device.id, requestId: request.id } })
  })
  return ok(request, { revoked: true }, reply)
})

app.post('/api/deviceos/rotate-credential', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const input = bodyOf(request, z.object({ requestId: deviceRequestId }))
  const token = randomSecret()
  const credentialId = randomUUID()
  const now = new Date()
  await prisma.$transaction(async (tx) => {
    const isNewRequest = await consumeDeviceRequest(tx, device.id, input.requestId, '/api/deviceos/rotate-credential')
    if (!isNewRequest) throw new ApiError('DEVICE_REQUEST_REPLAYED', 'Credential rotation request was already processed', 409)
    await tx.deviceCredential.updateMany({ where: { managedDeviceId: device.id, revokedAt: null }, data: { revokedAt: now } })
    await tx.deviceCredential.create({ data: { managedDeviceId: device.id, credentialId, tokenHash: hashSecret(token) } })
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, action: 'DEVICE_CREDENTIAL_ROTATED', entityType: 'DeviceCredential', entityId: credentialId, after: { credentialId, initiatedBy: 'DEVICE' } as any, requestId: request.id } })
  })
  return ok(request, { managedDeviceId: device.id, credentialId, deviceToken: token, rotatedAt: now }, reply)
})

app.get('/api/deviceos/storage', async (request, reply) => {
  if (config.deviceOsStorageMode === 's3') throw notFound('APK release not found')
  const query = request.query as { key?: string; expires?: string; signature?: string }
  const key = query.key ?? ''
  const expires = Number(query.expires)
  if (!key || !verifyLocalDownloadSignature(key, expires, query.signature ?? '')) throw forbidden('Signed APK URL is invalid or expired')
  const content = await deviceOsStorage().get(key).catch(() => null)
  if (!content) throw notFound('APK release not found')
  return sendDeviceOsApk(request, reply, content)
})

app.get('/api/admin/deviceos/devices', async (request, reply) => {
  await requireRoles(request, adminRoles)
  const devices = await prisma.managedDevice.findMany({ include: { display: { select: { id: true, name: true, deviceId: true, state: true, vehicle: { select: { registrationNumber: true, city: true } } } }, _count: { select: { inventory: true, deploymentTargets: true } } }, orderBy: { updatedAt: 'desc' } })
  return ok(request, asDeviceOsJson(devices), reply)
})

app.get('/api/admin/deviceos/devices/:managedDeviceId/inventory', async (request, reply) => {
  await requireRoles(request, adminRoles)
  const { managedDeviceId } = request.params as { managedDeviceId: string }
  const device = await prisma.managedDevice.findUnique({ where: { id: managedDeviceId }, select: { id: true } })
  if (!device) throw notFound('Managed DeviceOS device not found')
  const inventory = await prisma.deviceApplicationInventory.findMany({ where: { managedDeviceId }, include: { application: { select: { displayName: true, packageName: true } } }, orderBy: { packageName: 'asc' } })
  return ok(request, asDeviceOsJson(inventory), reply)
})

app.get('/api/admin/deviceos/telemetry', async (request, reply) => {
  await requireRoles(request, adminRoles)
  const devices = await prisma.managedDevice.findMany({ select: { id: true, displayId: true, enrollmentStatus: true, lastSeenAt: true, capabilities: true, display: { select: { name: true, deviceId: true } } }, orderBy: { lastSeenAt: 'desc' } })
  return ok(request, asDeviceOsJson(devices.map((device) => ({ ...device, telemetry: (device.capabilities as Record<string, unknown> | null)?.telemetry ?? {} }))), reply)
})

app.get('/api/admin/deviceos/audit-logs', async (request, reply) => {
  await requireRoles(request, adminRoles)
  const query = request.query as { limit?: string }
  const limit = Math.min(Math.max(Number(query.limit ?? 200) || 200, 1), 500)
  const events = await prisma.deviceOsAuditEvent.findMany({ take: limit, orderBy: { createdAt: 'desc' }, include: { managedDevice: { select: { display: { select: { name: true, deviceId: true } } } }, campaign: { select: { name: true } } } })
  return ok(request, asDeviceOsJson(events), reply)
})

app.post('/api/admin/deviceos/devices/:managedDeviceId/revoke', async (request, reply) => {
  const auth = await requireRoles(request, deviceOsWriteRoles)
  const { managedDeviceId } = request.params as { managedDeviceId: string }
  const device = await prisma.managedDevice.findUnique({ where: { id: managedDeviceId } })
  if (!device) throw notFound('Managed DeviceOS device not found')
  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.managedDevice.update({ where: { id: device.id }, data: { enrollmentStatus: 'REVOKED', revokedAt: now, rowVersion: { increment: 1 } } })
    await tx.deviceCredential.updateMany({ where: { managedDeviceId: device.id, revokedAt: null }, data: { revokedAt: now } })
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, actorId: auth.userId, actorRole: auth.role, action: 'DEVICE_REVOKED', entityType: 'ManagedDevice', entityId: device.id, before: { enrollmentStatus: device.enrollmentStatus } as any, after: { enrollmentStatus: 'REVOKED' } as any, requestId: request.id } })
    return row
  })
  return ok(request, asDeviceOsJson(updated), reply)
})

app.post('/api/admin/deviceos/devices/:managedDeviceId/rotate-credential', async (request, reply) => {
  const auth = await requireRoles(request, deviceOsWriteRoles)
  const { managedDeviceId } = request.params as { managedDeviceId: string }
  const device = await prisma.managedDevice.findUnique({ where: { id: managedDeviceId } })
  if (!device) throw notFound('Managed DeviceOS device not found')
  if (device.revokedAt || device.enrollmentStatus === 'REVOKED') throw new ApiError('DEVICE_REVOKED', 'Revoked DeviceOS credentials cannot be rotated', 409)
  const token = randomSecret()
  const credentialId = randomUUID()
  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.deviceCredential.updateMany({ where: { managedDeviceId: device.id, revokedAt: null }, data: { revokedAt: now } })
    await tx.deviceCredential.create({ data: { managedDeviceId: device.id, credentialId, tokenHash: hashSecret(token) } })
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, actorId: auth.userId, actorRole: auth.role, action: 'DEVICE_CREDENTIAL_ROTATED', entityType: 'DeviceCredential', entityId: credentialId, after: { credentialId } as any, requestId: request.id } })
  })
  return ok(request, { managedDeviceId: device.id, credentialId, deviceToken: token, rotatedAt: now }, reply)
})

app.get('/api/admin/deviceos/applications', async (request, reply) => {
  await requireRoles(request, adminRoles)
  return ok(request, asDeviceOsJson(await prisma.managedApplication.findMany({ include: { _count: { select: { releases: true, inventory: true } } }, orderBy: { updatedAt: 'desc' } })), reply)
})

app.post('/api/admin/deviceos/applications', async (request, reply) => {
  const auth = await requireRoles(request, deviceOsWriteRoles)
  const input = bodyOf(request, z.object({ packageName: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+$/), displayName: z.string().trim().min(1).max(160) }))
  let application
  try {
    application = await prisma.managedApplication.create({ data: input })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ApiError('APPLICATION_ALREADY_REGISTERED', 'An application with this package name is already registered', 409)
    throw error
  }
  await prisma.deviceOsAuditEvent.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'APPLICATION_REGISTERED', entityType: 'ManagedApplication', entityId: application.id, after: input as any, requestId: request.id } })
  return ok(request, application, reply)
})

app.post('/api/admin/deviceos/applications/:applicationId/allowlist', async (request, reply) => {
  const auth = await requireRoles(request, deviceOsWriteRoles)
  const { applicationId } = request.params as { applicationId: string }
  const input = bodyOf(request, z.object({ allowed: z.boolean() }))
  const application = await prisma.managedApplication.findUnique({ where: { id: applicationId } })
  if (!application) throw notFound('Managed application not found')
  if (application.allowed === input.allowed) return ok(request, application, reply)
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.managedApplication.update({ where: { id: applicationId }, data: { allowed: input.allowed } })
    await tx.deviceOsAuditEvent.create({ data: { actorId: auth.userId, actorRole: auth.role, action: input.allowed ? 'APPLICATION_ALLOWLISTED' : 'APPLICATION_BLOCKED', entityType: 'ManagedApplication', entityId: applicationId, before: { allowed: application.allowed } as any, after: { allowed: input.allowed } as any, requestId: request.id } })
    return next
  })
  return ok(request, updated, reply)
})

app.get('/api/admin/deviceos/applications/:applicationId/releases', async (request, reply) => {
  await requireRoles(request, adminRoles)
  const { applicationId } = request.params as { applicationId: string }
  const releases = await prisma.applicationRelease.findMany({ where: { applicationId }, orderBy: { createdAt: 'desc' } })
  return ok(request, asDeviceOsJson(releases), reply)
})

app.post('/api/admin/deviceos/applications/:applicationId/releases', { bodyLimit: deviceOsUploadBodyLimit }, async (request, reply) => {
  const auth = await requireRoles(request, deviceOsWriteRoles)
  const { applicationId } = request.params as { applicationId: string }
  const application = await prisma.managedApplication.findUnique({ where: { id: applicationId } })
  if (!application) throw notFound('Managed application not found')
  const input = bodyOf(request, z.object({ apkBase64: z.string().min(1), metadata: z.record(z.string(), z.unknown()).optional() }))
  const content = decodeApkBase64(input.apkBase64)
  const metadata = await inspectApk(content)
  if (metadata.packageName !== application.packageName) throw new ApiError('APK_PACKAGE_MISMATCH', `APK package ${metadata.packageName} does not match registered application ${application.packageName}`, 422)
  const duplicate = await prisma.applicationRelease.findFirst({ where: { applicationId, versionCode: metadata.versionCode, sha256: metadata.sha256 } })
  if (duplicate) return ok(request, { duplicate: true, release: asDeviceOsJson(duplicate) }, reply)
  const previousRelease = await prisma.applicationRelease.findFirst({ where: { applicationId }, orderBy: { createdAt: 'desc' }, select: { certificateSha256: true } })
  assertSigningCertificateContinuity(previousRelease?.certificateSha256, metadata.certificateSha256)
  const storageKey = `deviceos/${applicationId}/${metadata.versionCode.toString()}-${metadata.sha256}.apk`
  try { await deviceOsStorage().put(storageKey, content) } catch (error) { throw new ApiError('APK_STORAGE_UNAVAILABLE', error instanceof Error && error.message === 'DEVICEOS_S3_NOT_CONFIGURED' ? 'Private DeviceOS storage is not configured' : 'APK could not be stored', 503) }
  let releaseCreated = false
  try {
    const release = await prisma.applicationRelease.create({ data: { applicationId, packageName: metadata.packageName, versionCode: metadata.versionCode, versionName: metadata.versionName, minSdk: metadata.minSdk, targetSdk: metadata.targetSdk, sha256: metadata.sha256, certificateSha256: metadata.certificateSha256, storageKey, sizeBytes: metadata.sizeBytes, metadata: { ...(input.metadata ?? {}), label: metadata.label } as any } })
    releaseCreated = true
    await prisma.deviceOsAuditEvent.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'RELEASE_REGISTERED', entityType: 'ApplicationRelease', entityId: release.id, after: { applicationId, packageName: metadata.packageName, versionCode: metadata.versionCode.toString(), sha256: metadata.sha256, certificateSha256: metadata.certificateSha256 } as any, requestId: request.id } })
    return ok(request, asDeviceOsJson(release), reply)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.applicationRelease.findFirst({ where: { applicationId, versionCode: metadata.versionCode, sha256: metadata.sha256 } })
      if (existing) return ok(request, { duplicate: true, release: asDeviceOsJson(existing) }, reply)
      throw new ApiError('DUPLICATE_RELEASE', 'An identical immutable release already exists', 409)
    }
    if (!releaseCreated) await deviceOsStorage().delete(storageKey).catch(() => undefined)
    throw error
  }
})

app.post('/api/admin/deviceos/releases/:releaseId/approve', async (request, reply) => {
  const auth = await requireRoles(request, deviceOsWriteRoles)
  const { releaseId } = request.params as { releaseId: string }
  const release = await prisma.applicationRelease.findUnique({ where: { id: releaseId } })
  if (!release) throw notFound('Application release not found')
  if (release.approvalStatus === 'APPROVED') return ok(request, asDeviceOsJson(release), reply)
  if (release.approvalStatus !== 'DRAFT') throw new ApiError('RELEASE_NOT_APPROVABLE', `Release is ${release.approvalStatus}`, 409)
  const approved = await prisma.applicationRelease.update({ where: { id: release.id }, data: { approvalStatus: 'APPROVED', approvedBy: auth.userId, approvedAt: new Date() } })
  await prisma.deviceOsAuditEvent.create({ data: { actorId: auth.userId, actorRole: auth.role, action: 'RELEASE_APPROVED', entityType: 'ApplicationRelease', entityId: release.id, before: { approvalStatus: release.approvalStatus } as any, after: { approvalStatus: approved.approvalStatus, approvedBy: auth.userId } as any, requestId: request.id } })
  return ok(request, asDeviceOsJson(approved), reply)
})

app.get('/api/deviceos/releases/:releaseId/download', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const { releaseId } = request.params as { releaseId: string }
  const target = await prisma.deploymentTarget.findFirst({ where: { managedDeviceId: device.id, campaign: { releaseId, state: { in: ['ACTIVE', 'PAUSED'] }, application: { allowed: true } }, state: { in: ['ASSIGNED', 'DOWNLOADING', 'RETRY_WAIT'] } }, include: { campaign: { include: { release: true } } } })
  if (!target || target.campaign.release.approvalStatus !== 'APPROVED') throw forbidden('Release is not assigned to this device')
  if (target.campaign.release.packageName === 'com.ooro.screenplayer' && !isWithinMaintenanceWindow(new Date(), target.campaign.maintenanceWindowStart, target.campaign.maintenanceWindowEnd)) throw new ApiError('MAINTENANCE_WINDOW_CLOSED', 'Screen Player updates are outside the approved maintenance window', 409)
  const content = await deviceOsStorage().get(target.campaign.release.storageKey).catch(() => null)
  if (!content) throw notFound('APK release not found')
  return sendDeviceOsApk(request, reply, content, `${target.campaign.release.packageName}-${target.campaign.release.versionName}.apk`)
})

app.get('/api/deviceos/releases/:releaseId/download-url', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const { releaseId } = request.params as { releaseId: string }
  const target = await prisma.deploymentTarget.findFirst({ where: { managedDeviceId: device.id, campaign: { releaseId, state: 'ACTIVE', application: { allowed: true } }, state: { in: ['ASSIGNED', 'DOWNLOADING', 'RETRY_WAIT'] } }, include: { campaign: { include: { release: true } } } })
  if (!target || target.campaign.release.approvalStatus !== 'APPROVED') throw forbidden('Release is not assigned to this device')
  if (target.campaign.release.packageName === 'com.ooro.screenplayer' && !isWithinMaintenanceWindow(new Date(), target.campaign.maintenanceWindowStart, target.campaign.maintenanceWindowEnd)) throw new ApiError('MAINTENANCE_WINDOW_CLOSED', 'Screen Player updates are outside the approved maintenance window', 409)
  const url = await deviceOsStorage().signedDownloadUrl(target.campaign.release.storageKey, 300)
  return ok(request, { url, expiresInSeconds: 300, releaseId }, reply)
})

app.post('/api/deviceos/targets/:targetId/events', async (request, reply) => {
  const device = await authenticateDeviceOs(request)
  const { targetId } = request.params as { targetId: string }
  const input = bodyOf(request, z.object({ state: z.string(), installerSessionId: z.string().max(120).optional(), bytesDownloaded: z.coerce.bigint().nonnegative().optional(), checksumVerified: z.boolean().optional(), installerStatus: z.string().max(120).optional(), installerMessage: z.string().max(1000).optional(), installedVersionCode: z.coerce.bigint().nonnegative().optional(), installedVersionName: z.string().max(255).optional(), installedCertificateSha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(), healthStatus: z.string().max(80).optional(), errorCode: z.string().max(120).optional(), errorMessage: z.string().max(1000).optional(), idempotencyKey: z.string().min(8).max(200) }))
  const target = await prisma.deploymentTarget.findFirst({ where: { id: targetId, managedDeviceId: device.id }, include: { attempts: { orderBy: { attemptNumber: 'desc' }, take: 1 }, campaign: { include: { release: true } } } })
  if (!target) throw notFound('Deployment target not found')
  if (input.state === 'HEALTHY' && !isHealthyInstallationReportValid({ installedVersionCode: input.installedVersionCode, targetVersionCode: target.campaign.release.versionCode, installedCertificateSha256: input.installedCertificateSha256, releaseCertificateSha256: target.campaign.release.certificateSha256, healthStatus: input.healthStatus })) throw new ApiError('INVALID_HEALTH_REPORT', 'Healthy installation reports must include a compatible version and signing certificate', 422)
  const currentState = target.state
  const now = new Date()
  const updated = await prisma.$transaction(async (tx) => {
    const existingEvent = await tx.deviceOsAuditEvent.findFirst({ where: { managedDeviceId: device.id, idempotencyKey: input.idempotencyKey } })
    if (existingEvent) {
      const previousState = existingEvent.after && typeof existingEvent.after === 'object' && !Array.isArray(existingEvent.after) ? (existingEvent.after as Record<string, unknown>).reportedState : undefined
      validateDeviceOsEventTransition({ currentState, reportedState: input.state, campaignPaused: target.campaign.state === 'PAUSED', existingReportedState: previousState as string | undefined })
      return tx.deploymentTarget.findUniqueOrThrow({ where: { id: target.id } })
    }
    validateDeviceOsEventTransition({ currentState, reportedState: input.state, campaignPaused: target.campaign.state === 'PAUSED' })
    const retryLimit = 3
    const scheduleRetry = input.state === 'FAILED' && target.campaign.state === 'ACTIVE' && target.attemptCount < retryLimit - 1
    const persistedState = scheduleRetry ? 'RETRY_WAIT' : input.state
    const nextAttemptAt = scheduleRetry ? new Date(now.getTime() + retryDelayMs(target.attemptCount)) : undefined
    const row = await tx.deploymentTarget.updateMany({ where: { id: target.id, managedDeviceId: device.id, rowVersion: target.rowVersion }, data: { state: persistedState, rowVersion: { increment: 1 }, ...(scheduleRetry ? { attemptCount: { increment: 1 }, nextAttemptAt } : {}), ...(['HEALTHY', 'CANCELLED', 'QUARANTINED', 'FAILED'].includes(persistedState) ? { completedAt: now } : {}), lastErrorCode: input.errorCode, lastErrorMessage: input.errorMessage } })
    if (row.count !== 1) throw new ApiError('DEPLOYMENT_STATE_CONFLICT', 'Deployment target changed concurrently; retry the event', 409)
    const attempt = target.attempts[0]
    if (attempt) await tx.deploymentAttempt.update({ where: { id: attempt.id }, data: { state: input.state, installerSessionId: input.installerSessionId, bytesDownloaded: input.bytesDownloaded, checksumVerified: input.checksumVerified ?? attempt.checksumVerified, ...(input.state === 'DOWNLOADING' ? { startedAt: now } : {}), ...(['HEALTHY', 'FAILED', 'QUARANTINED', 'CANCELLED'].includes(input.state) ? { completedAt: now } : {}), errorCode: input.errorCode, errorMessage: input.errorMessage } })
    if (scheduleRetry && attempt) await tx.deploymentAttempt.create({ data: { targetId: target.id, managedDeviceId: device.id, attemptNumber: attempt.attemptNumber + 1, state: 'RETRY_WAIT', idempotencyKey: `${target.campaignId}:${device.id}:${attempt.attemptNumber + 1}` } })
    if (input.installerStatus || input.installedVersionCode != null || input.healthStatus) {
      if (!attempt) throw new ApiError('DEPLOYMENT_ATTEMPT_MISSING', 'Deployment attempt is missing', 409)
      await tx.installationResult.upsert({ where: { attemptId: attempt.id }, create: { attemptId: attempt.id, managedDeviceId: device.id, packageName: target.campaign.release.packageName, installedVersionCode: input.installedVersionCode, installedVersionName: input.installedVersionName, installerStatus: input.installerStatus ?? input.state, installerMessage: input.installerMessage, healthStatus: input.healthStatus, healthyAt: input.healthStatus === 'HEALTHY' ? now : undefined }, update: { installedVersionCode: input.installedVersionCode, installedVersionName: input.installedVersionName, installerStatus: input.installerStatus ?? input.state, installerMessage: input.installerMessage, healthStatus: input.healthStatus, healthyAt: input.healthStatus === 'HEALTHY' ? now : undefined, reportedAt: now } })
    }
    const [grouped, healthFailureCount] = await Promise.all([
      tx.deploymentTarget.groupBy({ by: ['state'], where: { campaignId: target.campaignId }, _count: { _all: true } }),
      tx.installationResult.count({ where: { healthStatus: 'FAILED', attempt: { target: { campaignId: target.campaignId } } } }),
    ])
    const snapshot = grouped.reduce((result, row) => {
      result.total += row._count._all
      if (row.state === 'HEALTHY') result.healthy += row._count._all
      if (row.state === 'FAILED') result.failed += row._count._all
      if (row.state === 'QUARANTINED') result.quarantined += row._count._all
      return result
    }, { total: 0, healthy: 0, failed: 0, quarantined: 0, healthFailures: healthFailureCount })
    const gate = campaignHealthGate(snapshot, { maxFailureRatePercent: target.campaign.maxFailureRatePercent, healthGate: target.campaign.healthGate as Record<string, unknown> | null })
    if (gate.pause && target.campaign.state === 'ACTIVE') {
      await tx.deploymentCampaign.update({ where: { id: target.campaignId }, data: { state: 'PAUSED', pausedAt: now, pauseReason: gate.reason } })
      await tx.deploymentTarget.updateMany({ where: { campaignId: target.campaignId, state: { in: ['PENDING', 'ASSIGNED', 'RETRY_WAIT'] } }, data: { state: 'PAUSED', rowVersion: { increment: 1 } } })
      await tx.managedDevice.updateMany({ where: { deploymentTargets: { some: { campaignId: target.campaignId } } }, data: { desiredStateVersion: { increment: 1 } } })
      await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, campaignId: target.campaignId, action: 'DEPLOYMENT_HEALTH_GATE_PAUSED', entityType: 'DeploymentCampaign', entityId: target.campaignId, after: { reason: gate.reason, snapshot } as any, requestId: request.id } })
    }
    await tx.deviceOsAuditEvent.create({ data: { managedDeviceId: device.id, campaignId: target.campaignId, action: 'DEPLOYMENT_STATE_REPORTED', entityType: 'DeploymentTarget', entityId: target.id, idempotencyKey: input.idempotencyKey, after: { from: currentState, reportedState: input.state, persistedState, retryScheduled: scheduleRetry, installerStatus: input.installerStatus, errorCode: input.errorCode } as any, requestId: request.id } })
    return tx.deploymentTarget.findUniqueOrThrow({ where: { id: target.id } })
  })
  return ok(request, asDeviceOsJson(updated), reply)
})

app.post('/api/admin/deviceos/deployments', async (request, reply) => {
  const auth = await requireRoles(request, deviceOsWriteRoles)
  const input = bodyOf(request, z.object({
    name: z.string().trim().min(1).max(160),
    applicationId: z.string().uuid(),
    releaseId: z.string().uuid(),
    targetingMode: z.enum(deploymentTargetingModes),
    deviceIds: z.array(z.string().uuid()).max(5000).optional(),
    groupId: z.string().uuid().optional(),
    city: z.string().trim().max(120).optional(),
    targetPercentage: z.number().int().min(1).max(100).optional(),
    maintenanceWindowStart: z.coerce.date().optional(),
    maintenanceWindowEnd: z.coerce.date().optional(),
    maxFailureRatePercent: z.number().int().min(0).max(100).optional(),
    healthGate: z.record(z.string(), z.unknown()).optional(),
  }))
  const headerKey = request.headers['idempotency-key']
  const idempotencyKey = typeof headerKey === 'string' ? headerKey.trim() : undefined
  if (idempotencyKey && (idempotencyKey.length < 8 || idempotencyKey.length > 200)) throw new ApiError('IDEMPOTENCY_KEY_INVALID', 'Idempotency-Key must be between 8 and 200 characters', 422)
  const result = await createDeviceOsCampaign(prisma, { ...input, idempotencyKey, createdBy: auth.userId })
  return ok(request, asDeviceOsJson(result), reply)
})

app.get('/api/admin/deviceos/deployments', async (request, reply) => {
  await requireRoles(request, adminRoles)
  const campaigns = await prisma.deploymentCampaign.findMany({ include: { application: true, release: true, _count: { select: { targets: true } }, targets: { select: { state: true } } }, orderBy: { createdAt: 'desc' } })
  const summarized = campaigns.map(({ targets, ...campaign }) => ({ ...campaign, targetSummary: targets.reduce<Record<string, number>>((summary, target) => { summary[target.state] = (summary[target.state] ?? 0) + 1; return summary }, {}) }))
  return ok(request, asDeviceOsJson(summarized), reply)
})

app.get('/api/admin/deviceos/deployments/:campaignId', async (request, reply) => {
  await requireRoles(request, adminRoles)
  const { campaignId } = request.params as { campaignId: string }
  const campaign = await prisma.deploymentCampaign.findUnique({
    where: { id: campaignId },
    include: {
      application: true,
      release: true,
      targets: {
        include: {
          managedDevice: { include: { display: { select: { id: true, name: true, deviceId: true } } } },
          attempts: { include: { installationResult: true }, orderBy: { attemptNumber: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!campaign) throw notFound('Deployment campaign not found')
  return ok(request, asDeviceOsJson(campaign), reply)
})

app.post('/api/admin/deviceos/deployments/:campaignId/pause', async (request, reply) => {
  const auth = await requireRoles(request, deviceOsWriteRoles)
  const { campaignId } = request.params as { campaignId: string }
  const input = bodyOf(request, z.object({ reason: z.string().trim().min(1).max(500) }))
  return ok(request, asDeviceOsJson(await pauseDeviceOsCampaign(prisma, campaignId, input.reason, auth.userId, auth.role)), reply)
})

app.post('/api/admin/deviceos/deployments/:campaignId/resume', async (request, reply) => {
  const auth = await requireRoles(request, deviceOsWriteRoles)
  const { campaignId } = request.params as { campaignId: string }
  return ok(request, asDeviceOsJson(await resumeDeviceOsCampaign(prisma, campaignId, auth.userId, auth.role)), reply)
})

app.get('/health', async (request, reply) => ok(request, { status: 'ok', service: 'ooro-deviceos-api' }, reply))
app.get('/api/health', async (request, reply) => ok(request, { status: 'ok', service: 'ooro-deviceos-api' }, reply))
app.get('/api/health/db', async (request, reply) => {
  try { await prisma.$queryRaw`SELECT 1`; return ok(request, { status: 'ok', service: 'ooro-deviceos-api', database: 'ok' }, reply) }
  catch { return reply.code(503).send({ data: null, error: { code: 'DATABASE_UNAVAILABLE', message: 'Database dependency unavailable' } }) }
})
app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'request failed')
  const status = error instanceof ApiError ? error.statusCode : error instanceof z.ZodError ? 422 : error instanceof Prisma.PrismaClientKnownRequestError && ['P2034','P2002'].includes(error.code) ? 409 : 500
  const message = error instanceof Error ? error.message : 'Internal server error'
  reply.status(status).send({ data: null, error: { code: error instanceof ApiError ? error.code : 'INTERNAL_ERROR', message: status === 500 ? 'Internal server error' : message }, requestId: request.id })
})
export { app }

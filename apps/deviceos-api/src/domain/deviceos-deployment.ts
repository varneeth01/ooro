import { randomUUID } from 'node:crypto'
import { Prisma, PrismaClient } from '@prisma/client'
import { ApiError } from '../errors.js'
import { includedInPercentageCohort, isManagedDeviceReleaseCompatible } from './deviceos.js'

export const deploymentTargetingModes = ['DEVICES', 'GROUP', 'CITY', 'PERCENTAGE'] as const

export function normalizeDeploymentTargetingSpec(input: { targetingMode: typeof deploymentTargetingModes[number]; deviceIds?: string[]; groupId?: string; city?: string; targetPercentage?: number }) {
  return {
    targetingMode: input.targetingMode,
    ...(input.targetingMode === 'DEVICES' ? { deviceIds: [...(input.deviceIds ?? [])].sort() } : {}),
    ...(input.targetingMode === 'GROUP' ? { groupId: input.groupId } : {}),
    ...(input.targetingMode === 'CITY' ? { city: input.city?.trim().toLowerCase() } : {}),
    ...(input.targetingMode === 'PERCENTAGE' ? { targetPercentage: input.targetPercentage } : {}),
  }
}

function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJson)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, canonicalJson(nested)]))
  return value
}

function sameTargetingSpec(existing: Prisma.JsonValue | null, expected: ReturnType<typeof normalizeDeploymentTargetingSpec>): boolean {
  return JSON.stringify(canonicalJson(existing)) === JSON.stringify(canonicalJson(expected))
}

export type CampaignHealthSnapshot = {
  total: number
  healthy: number
  failed: number
  quarantined: number
  healthFailures: number
}

export function isWithinMaintenanceWindow(now: Date, start?: Date | null, end?: Date | null): boolean {
  if (!start && !end) return true
  if (!start || !end || end < start) return false
  return now >= start && now <= end
}

export function campaignHealthGate(snapshot: CampaignHealthSnapshot, policy: { maxFailureRatePercent: number; healthGate?: Record<string, unknown> | null }) {
  if (snapshot.total === 0) return { pause: false, reason: undefined }
  const failureRatePercent = ((snapshot.failed + snapshot.quarantined) / snapshot.total) * 100
  if (failureRatePercent > policy.maxFailureRatePercent) return { pause: true, reason: `FAILURE_RATE_${failureRatePercent.toFixed(2)}_PERCENT` }
  if (policy.healthGate?.stopOnHealthFailure === true && snapshot.healthFailures > 0) return { pause: true, reason: 'HEALTH_GATE_FAILURE' }
  const minimumHealthyPercent = typeof policy.healthGate?.minimumHealthyPercent === 'number' ? policy.healthGate.minimumHealthyPercent : undefined
  if (minimumHealthyPercent != null && (snapshot.healthy / snapshot.total) * 100 < minimumHealthyPercent) return { pause: true, reason: `HEALTHY_RATE_BELOW_${minimumHealthyPercent}_PERCENT` }
  return { pause: false, reason: undefined }
}

export async function createDeviceOsCampaign(prisma: PrismaClient, input: {
  name: string
  applicationId: string
  releaseId: string
  targetingMode: typeof deploymentTargetingModes[number]
  deviceIds?: string[]
  groupId?: string
  city?: string
  targetPercentage?: number
  maintenanceWindowStart?: Date
  maintenanceWindowEnd?: Date
  maxFailureRatePercent?: number
  healthGate?: Record<string, unknown>
  idempotencyKey?: string
  createdBy?: string
}) {
  const release = await prisma.applicationRelease.findUnique({ where: { id: input.releaseId }, include: { application: true } })
  if (!release || release.applicationId !== input.applicationId) throw new ApiError('RELEASE_APPLICATION_MISMATCH', 'Release does not belong to the selected application', 422)
  if (release.approvalStatus !== 'APPROVED') throw new ApiError('RELEASE_NOT_APPROVED', 'Only approved releases can be deployed', 409)
  if (!release.application.allowed) throw new ApiError('APPLICATION_NOT_ALLOWED', 'The application is not allowlisted', 409)
  if (input.targetingMode === 'PERCENTAGE' && (input.targetPercentage == null || input.targetPercentage < 1 || input.targetPercentage > 100)) throw new ApiError('TARGET_PERCENTAGE_INVALID', 'Percentage targeting must be between 1 and 100', 422)
  if (input.targetingMode === 'CITY' && !input.city?.trim()) throw new ApiError('TARGET_CITY_REQUIRED', 'City targeting requires a city', 422)
  if (input.targetingMode === 'GROUP' && !input.groupId) throw new ApiError('TARGET_GROUP_REQUIRED', 'Group targeting requires a group', 422)
  if (input.targetingMode === 'DEVICES' && !input.deviceIds?.length) throw new ApiError('TARGET_DEVICES_REQUIRED', 'Device targeting requires at least one device', 422)
  const hasInvalidMaintenanceWindow = (input.maintenanceWindowStart && !input.maintenanceWindowEnd) || (!input.maintenanceWindowStart && input.maintenanceWindowEnd) || (input.maintenanceWindowStart != null && input.maintenanceWindowEnd != null && input.maintenanceWindowEnd < input.maintenanceWindowStart)
  if (hasInvalidMaintenanceWindow) throw new ApiError('MAINTENANCE_WINDOW_INVALID', 'Maintenance window must include an end after its start', 422)
  const minimumHealthyPercent = input.healthGate?.minimumHealthyPercent
  if (minimumHealthyPercent != null && (typeof minimumHealthyPercent !== 'number' || minimumHealthyPercent < 0 || minimumHealthyPercent > 100)) throw new ApiError('HEALTH_GATE_INVALID', 'minimumHealthyPercent must be between 0 and 100', 422)
  if (input.healthGate?.stopOnHealthFailure != null && typeof input.healthGate.stopOnHealthFailure !== 'boolean') throw new ApiError('HEALTH_GATE_INVALID', 'stopOnHealthFailure must be boolean', 422)
  if (input.maxFailureRatePercent != null && (input.maxFailureRatePercent < 0 || input.maxFailureRatePercent > 100)) throw new ApiError('FAILURE_RATE_INVALID', 'maxFailureRatePercent must be between 0 and 100', 422)
  const requestedTargetingSpec = normalizeDeploymentTargetingSpec(input)

  if (input.idempotencyKey) {
    const existing = await prisma.deploymentCampaign.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { _count: { select: { targets: true } } } })
    if (existing) {
      if (existing.applicationId !== input.applicationId || existing.releaseId !== input.releaseId || existing.name !== input.name || existing.targetingMode !== input.targetingMode || existing.city !== (input.city?.trim() || null) || existing.targetPercentage !== (input.targetPercentage ?? null) || !sameTargetingSpec(existing.targetingSpec, requestedTargetingSpec)) throw new ApiError('DEPLOYMENT_IDEMPOTENCY_CONFLICT', 'Idempotency key is already used for a different deployment', 409)
      return { campaign: existing, targetCount: existing._count.targets }
    }
  }

  const seed = randomUUID()
  const candidates = await prisma.managedDevice.findMany({ where: { enrollmentStatus: 'ENROLLED', revokedAt: null, ...(input.targetingMode === 'DEVICES' ? { id: { in: input.deviceIds } } : {}), ...(input.targetingMode === 'CITY' ? { OR: [{ city: { equals: input.city, mode: 'insensitive' } }, { display: { vehicle: { city: { equals: input.city, mode: 'insensitive' } } } }] } : {}), ...(input.targetingMode === 'GROUP' ? { display: { groups: { some: { groupId: input.groupId } } } } : {}) }, select: { id: true, capabilities: true, inventory: { where: { packageName: release.packageName }, select: { versionCode: true } } } })
  const compatibleCandidates = candidates.filter((device) => {
    const capabilities = device.capabilities && typeof device.capabilities === 'object' && !Array.isArray(device.capabilities) ? device.capabilities as Record<string, unknown> : null
    const sdkValue = capabilities?.androidSdkInt
    const deviceSdk = typeof sdkValue === 'number' && Number.isInteger(sdkValue) && sdkValue > 0 ? sdkValue : null
    return isManagedDeviceReleaseCompatible({ currentVersionCode: device.inventory[0]?.versionCode, targetVersionCode: release.versionCode, minSdk: release.minSdk, deviceSdk })
  })
  const selected = input.targetingMode === 'PERCENTAGE' ? compatibleCandidates.filter((device) => includedInPercentageCohort(device.id, seed, input.targetPercentage!)) : compatibleCandidates
  if (!selected.length) throw new ApiError('NO_DEPLOYMENT_TARGETS', 'No enrolled devices matched this deployment target', 422)

  try {
    return await prisma.$transaction(async (tx) => {
    const campaign = await tx.deploymentCampaign.create({ data: { name: input.name, applicationId: input.applicationId, releaseId: input.releaseId, idempotencyKey: input.idempotencyKey, state: 'ACTIVE', targetingMode: input.targetingMode, city: input.city?.trim() || undefined, targetPercentage: input.targetPercentage, targetingSpec: requestedTargetingSpec as Prisma.InputJsonValue, cohortSeed: seed, maintenanceWindowStart: input.maintenanceWindowStart, maintenanceWindowEnd: input.maintenanceWindowEnd, maxFailureRatePercent: input.maxFailureRatePercent ?? 10, healthGate: input.healthGate as Prisma.InputJsonValue, createdBy: input.createdBy } })
    await tx.managedDevice.updateMany({ where: { id: { in: selected.map((device) => device.id) } }, data: { desiredStateVersion: { increment: 1 } } })
    for (const device of selected) {
      const target = await tx.deploymentTarget.create({ data: { campaignId: campaign.id, managedDeviceId: device.id, state: 'ASSIGNED', assignedAt: new Date(), rowVersion: 1 } })
      await tx.deploymentAttempt.create({ data: { targetId: target.id, managedDeviceId: device.id, attemptNumber: 1, state: 'ASSIGNED', idempotencyKey: `${campaign.id}:${device.id}:1` } })
    }
    await tx.deviceOsAuditEvent.create({ data: { campaignId: campaign.id, actorId: input.createdBy, action: 'DEPLOYMENT_CREATED', entityType: 'DeploymentCampaign', entityId: campaign.id, after: { targetingMode: input.targetingMode, targetCount: selected.length, releaseId: input.releaseId, cohortSeed: seed } as Prisma.InputJsonValue } })
      return { campaign, targetCount: selected.length }
    })
  } catch (error) {
    if (input.idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.deploymentCampaign.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: { _count: { select: { targets: true } } } })
      if (existing) {
        if (existing.applicationId !== input.applicationId || existing.releaseId !== input.releaseId || existing.name !== input.name || existing.targetingMode !== input.targetingMode || existing.city !== (input.city?.trim() || null) || existing.targetPercentage !== (input.targetPercentage ?? null) || !sameTargetingSpec(existing.targetingSpec, requestedTargetingSpec)) throw new ApiError('DEPLOYMENT_IDEMPOTENCY_CONFLICT', 'Idempotency key is already used for a different deployment', 409)
        return { campaign: existing, targetCount: existing._count.targets }
      }
    }
    throw error
  }
}

export async function pauseDeviceOsCampaign(prisma: PrismaClient, campaignId: string, reason: string, actorId?: string, actorRole?: string) {
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.deploymentCampaign.findUnique({ where: { id: campaignId } })
    if (!campaign) throw new ApiError('DEPLOYMENT_NOT_FOUND', 'Deployment campaign not found', 404)
    if (!['ACTIVE', 'PAUSED'].includes(campaign.state)) throw new ApiError('DEPLOYMENT_NOT_PAUSABLE', `Deployment is ${campaign.state}`, 409)
    if (campaign.state === 'PAUSED') return campaign
    const updated = await tx.deploymentCampaign.update({ where: { id: campaignId }, data: { state: 'PAUSED', pausedAt: new Date(), pauseReason: reason } })
    await tx.deploymentTarget.updateMany({ where: { campaignId, state: { in: ['PENDING', 'ASSIGNED', 'RETRY_WAIT'] } }, data: { state: 'PAUSED', rowVersion: { increment: 1 } } })
    const targetDevices = await tx.deploymentTarget.findMany({ where: { campaignId }, select: { managedDeviceId: true } })
    await tx.managedDevice.updateMany({ where: { id: { in: targetDevices.map((target) => target.managedDeviceId) } }, data: { desiredStateVersion: { increment: 1 } } })
    await tx.deviceOsAuditEvent.create({ data: { campaignId, actorId, actorRole, action: 'DEPLOYMENT_PAUSED', entityType: 'DeploymentCampaign', entityId: campaignId, before: { state: campaign.state } as Prisma.InputJsonValue, after: { state: 'PAUSED', reason } as Prisma.InputJsonValue } })
    return updated
  })
}

export async function resumeDeviceOsCampaign(prisma: PrismaClient, campaignId: string, actorId?: string, actorRole?: string) {
  return prisma.$transaction(async (tx) => {
    const campaign = await tx.deploymentCampaign.findUnique({ where: { id: campaignId } })
    if (!campaign) throw new ApiError('DEPLOYMENT_NOT_FOUND', 'Deployment campaign not found', 404)
    if (campaign.state !== 'PAUSED') throw new ApiError('DEPLOYMENT_NOT_RESUMABLE', `Deployment is ${campaign.state}`, 409)
    const updated = await tx.deploymentCampaign.update({ where: { id: campaignId }, data: { state: 'ACTIVE', pausedAt: null, pauseReason: null } })
    await tx.deploymentTarget.updateMany({ where: { campaignId, state: 'PAUSED' }, data: { state: 'ASSIGNED', nextAttemptAt: null, rowVersion: { increment: 1 } } })
    const targetDevices = await tx.deploymentTarget.findMany({ where: { campaignId }, select: { managedDeviceId: true } })
    await tx.managedDevice.updateMany({ where: { id: { in: targetDevices.map((target) => target.managedDeviceId) } }, data: { desiredStateVersion: { increment: 1 } } })
    await tx.deviceOsAuditEvent.create({ data: { campaignId, actorId, actorRole, action: 'DEPLOYMENT_RESUMED', entityType: 'DeploymentCampaign', entityId: campaignId, before: { state: campaign.state } as Prisma.InputJsonValue, after: { state: 'ACTIVE' } as Prisma.InputJsonValue } })
    return updated
  })
}

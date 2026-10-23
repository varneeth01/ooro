import { createHash } from 'node:crypto'
import { ApiError } from '../errors.js'

export const deviceOsDeploymentStates = [
  'PENDING', 'ASSIGNED', 'DOWNLOADING', 'DOWNLOADED', 'VERIFIED', 'INSTALLING',
  'PENDING_USER_ACTION', 'INSTALLED', 'HEALTH_CHECK', 'HEALTHY', 'FAILED', 'RETRY_WAIT', 'PAUSED',
  'QUARANTINED', 'CANCELLED',
] as const

export type DeviceOsDeploymentState = typeof deviceOsDeploymentStates[number]

const transitions: Record<DeviceOsDeploymentState, readonly DeviceOsDeploymentState[]> = {
  PENDING: ['ASSIGNED', 'PAUSED', 'CANCELLED'],
  ASSIGNED: ['DOWNLOADING', 'HEALTH_CHECK', 'PAUSED', 'CANCELLED', 'FAILED'],
  DOWNLOADING: ['DOWNLOADED', 'RETRY_WAIT', 'PAUSED', 'FAILED', 'CANCELLED'],
  DOWNLOADED: ['VERIFIED', 'FAILED', 'PAUSED', 'CANCELLED'],
  VERIFIED: ['INSTALLING', 'FAILED', 'PAUSED', 'CANCELLED'],
  INSTALLING: ['PENDING_USER_ACTION', 'INSTALLED', 'FAILED', 'PAUSED'],
  PENDING_USER_ACTION: ['INSTALLING', 'INSTALLED', 'FAILED', 'PAUSED'],
  INSTALLED: ['HEALTH_CHECK', 'FAILED'],
  HEALTH_CHECK: ['HEALTHY', 'FAILED', 'QUARANTINED'],
  HEALTHY: [],
  FAILED: ['RETRY_WAIT', 'PAUSED', 'CANCELLED', 'QUARANTINED'],
  RETRY_WAIT: ['ASSIGNED', 'PAUSED', 'CANCELLED', 'QUARANTINED'],
  PAUSED: ['ASSIGNED', 'CANCELLED'],
  QUARANTINED: ['PAUSED', 'CANCELLED'],
  CANCELLED: [],
}

export function assertDeploymentTransition(from: string, to: string): asserts to is DeviceOsDeploymentState {
  if (!deviceOsDeploymentStates.includes(from as DeviceOsDeploymentState) || !deviceOsDeploymentStates.includes(to as DeviceOsDeploymentState)) {
    throw new ApiError('INVALID_DEPLOYMENT_STATE', `Unsupported deployment state transition ${from} → ${to}`, 422)
  }
  if (!transitions[from as DeviceOsDeploymentState].includes(to as DeviceOsDeploymentState)) {
    throw new ApiError('INVALID_DEPLOYMENT_TRANSITION', `Deployment cannot move from ${from} to ${to}`, 409)
  }
}

export function validateDeviceOsEventTransition(input: {
  currentState: string
  reportedState: string
  campaignPaused: boolean
  existingReportedState?: string
}): void {
  if (input.existingReportedState !== undefined) {
    if (input.existingReportedState !== input.reportedState) {
      throw new ApiError('DEPLOYMENT_EVENT_IDEMPOTENCY_CONFLICT', 'Idempotency key was already used for a different deployment state', 409)
    }
    return
  }
  if (input.campaignPaused && !['PAUSED', 'FAILED'].includes(input.reportedState)) {
    throw new ApiError('DEPLOYMENT_PAUSED', 'Deployment is paused', 409)
  }
  if (input.currentState !== input.reportedState) assertDeploymentTransition(input.currentState, input.reportedState)
}

export function retryDelayMs(attempt: number, baseMs = 30_000, maxMs = 6 * 60 * 60 * 1000): number {
  const boundedAttempt = Math.max(0, Math.min(attempt, 16))
  return Math.min(maxMs, baseMs * (2 ** boundedAttempt))
}

export function deterministicCohort(deviceId: string, seed: string): number {
  const digest = createHash('sha256').update(`${seed}:${deviceId}`).digest()
  return digest.readUInt32BE(0) % 100
}

export function includedInPercentageCohort(deviceId: string, seed: string, percentage: number): boolean {
  return deterministicCohort(deviceId, seed) < Math.max(0, Math.min(100, percentage))
}

export function isReleaseInstallable(input: { currentVersionCode?: bigint | number | null; targetVersionCode: bigint | number; minSdk: number; deviceSdk: number }): boolean {
  const current = input.currentVersionCode == null ? null : BigInt(input.currentVersionCode)
  const target = BigInt(input.targetVersionCode)
  return input.deviceSdk >= input.minSdk && (current == null || target >= current)
}

export function isManagedDeviceReleaseCompatible(input: { currentVersionCode?: bigint | number | null; targetVersionCode: bigint | number; minSdk: number; deviceSdk?: number | null }): boolean {
  const current = input.currentVersionCode == null ? null : BigInt(input.currentVersionCode)
  const target = BigInt(input.targetVersionCode)
  return (input.deviceSdk == null || input.deviceSdk >= input.minSdk) && (current == null || target >= current)
}

export function isHealthyInstallationReportValid(input: { installedVersionCode?: bigint | number | null; targetVersionCode: bigint | number; installedCertificateSha256?: string | null; releaseCertificateSha256: string; healthStatus?: string }): boolean {
  const installedVersion = input.installedVersionCode == null ? null : BigInt(input.installedVersionCode)
  return input.healthStatus === 'HEALTHY'
    && installedVersion != null
    && installedVersion >= BigInt(input.targetVersionCode)
    && /^[a-f0-9]{64}$/i.test(input.installedCertificateSha256 ?? '')
    && input.installedCertificateSha256!.toLowerCase() === input.releaseCertificateSha256.toLowerCase()
}

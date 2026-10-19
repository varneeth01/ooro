import assert from 'node:assert/strict'
import test from 'node:test'
import { campaignHealthGate, isWithinMaintenanceWindow, normalizeDeploymentTargetingSpec } from './deviceos-deployment.js'
import { assertDeploymentTransition, deterministicCohort, includedInPercentageCohort, isHealthyInstallationReportValid, isManagedDeviceReleaseCompatible, isReleaseInstallable, retryDelayMs, validateDeviceOsEventTransition } from './deviceos.js'

test('DeviceOS deployment transitions reject invalid skips', () => {
  assert.doesNotThrow(() => assertDeploymentTransition('ASSIGNED', 'DOWNLOADING'))
  assert.throws(() => assertDeploymentTransition('ASSIGNED', 'HEALTHY'), /cannot move/)
  assert.throws(() => assertDeploymentTransition('UNKNOWN', 'HEALTHY'), /Unsupported/)
})

test('DeviceOS event replay is accepted before retry-state transition validation', () => {
  assert.doesNotThrow(() => validateDeviceOsEventTransition({ currentState: 'RETRY_WAIT', reportedState: 'FAILED', campaignPaused: false, existingReportedState: 'FAILED' }))
  assert.throws(() => validateDeviceOsEventTransition({ currentState: 'RETRY_WAIT', reportedState: 'DOWNLOADED', campaignPaused: false, existingReportedState: 'FAILED' }), /already used for a different deployment state/)
})

test('pending user action is an explicit recoverable installer state', () => {
  assert.doesNotThrow(() => assertDeploymentTransition('INSTALLING', 'PENDING_USER_ACTION'))
  assert.doesNotThrow(() => assertDeploymentTransition('PENDING_USER_ACTION', 'INSTALLED'))
  assert.throws(() => assertDeploymentTransition('DOWNLOADED', 'PENDING_USER_ACTION'), /cannot move/)
})

test('DeviceOS retries use bounded exponential backoff', () => {
  assert.equal(retryDelayMs(0), 30_000)
  assert.equal(retryDelayMs(3), 240_000)
  assert.equal(retryDelayMs(99), 6 * 60 * 60 * 1000)
})

test('DeviceOS canary cohorts are deterministic and bounded', () => {
  const first = deterministicCohort('device-1', 'campaign-1')
  assert.equal(first, deterministicCohort('device-1', 'campaign-1'))
  assert.ok(first >= 0 && first < 100)
  assert.equal(includedInPercentageCohort('device-1', 'campaign-1', 0), false)
  assert.equal(includedInPercentageCohort('device-1', 'campaign-1', 100), true)
})

test('downgrades and incompatible SDK releases are rejected', () => {
  assert.equal(isReleaseInstallable({ currentVersionCode: 10n, targetVersionCode: 9n, minSdk: 26, deviceSdk: 35 }), false)
  assert.equal(isReleaseInstallable({ currentVersionCode: 10n, targetVersionCode: 11n, minSdk: 36, deviceSdk: 35 }), false)
  assert.equal(isReleaseInstallable({ currentVersionCode: 10n, targetVersionCode: 11n, minSdk: 26, deviceSdk: 35 }), true)
})

test('server targeting rejects known incompatible devices but preserves unknown capability records', () => {
  assert.equal(isManagedDeviceReleaseCompatible({ currentVersionCode: 10n, targetVersionCode: 9n, minSdk: 26, deviceSdk: 35 }), false)
  assert.equal(isManagedDeviceReleaseCompatible({ currentVersionCode: 10n, targetVersionCode: 11n, minSdk: 36, deviceSdk: 35 }), false)
  assert.equal(isManagedDeviceReleaseCompatible({ currentVersionCode: null, targetVersionCode: 11n, minSdk: 36, deviceSdk: null }), true)
})

test('healthy installation reports require a compatible version, certificate, and status', () => {
  const certificate = 'ab'.repeat(32)
  assert.equal(isHealthyInstallationReportValid({ installedVersionCode: 2n, targetVersionCode: 1n, installedCertificateSha256: certificate, releaseCertificateSha256: certificate, healthStatus: 'HEALTHY' }), true)
  assert.equal(isHealthyInstallationReportValid({ installedVersionCode: 1n, targetVersionCode: 2n, installedCertificateSha256: certificate, releaseCertificateSha256: certificate, healthStatus: 'HEALTHY' }), false)
  assert.equal(isHealthyInstallationReportValid({ installedVersionCode: 2n, targetVersionCode: 1n, installedCertificateSha256: 'cd'.repeat(32), releaseCertificateSha256: certificate, healthStatus: 'HEALTHY' }), false)
  assert.equal(isHealthyInstallationReportValid({ installedVersionCode: 2n, targetVersionCode: 1n, installedCertificateSha256: certificate, releaseCertificateSha256: certificate, healthStatus: 'INSTALLED' }), false)
})

test('campaign health gates pause on excessive failures or critical health failures', () => {
  assert.deepEqual(campaignHealthGate({ total: 10, healthy: 8, failed: 2, quarantined: 0, healthFailures: 0 }, { maxFailureRatePercent: 10 }), { pause: true, reason: 'FAILURE_RATE_20.00_PERCENT' })
  assert.deepEqual(campaignHealthGate({ total: 10, healthy: 9, failed: 0, quarantined: 0, healthFailures: 1 }, { maxFailureRatePercent: 10, healthGate: { stopOnHealthFailure: true } }), { pause: true, reason: 'HEALTH_GATE_FAILURE' })
  assert.equal(campaignHealthGate({ total: 10, healthy: 9, failed: 1, quarantined: 0, healthFailures: 0 }, { maxFailureRatePercent: 10 }).pause, false)
})

test('maintenance windows are explicit and bounded', () => {
  const start = new Date('2026-10-16T10:00:00.000Z')
  const end = new Date('2026-10-16T11:00:00.000Z')
  assert.equal(isWithinMaintenanceWindow(new Date('2026-10-16T10:30:00.000Z'), start, end), true)
  assert.equal(isWithinMaintenanceWindow(new Date('2026-10-16T09:59:59.000Z'), start, end), false)
  assert.equal(isWithinMaintenanceWindow(new Date('2026-10-16T10:30:00.000Z'), start, null), false)
  assert.equal(isWithinMaintenanceWindow(new Date('2026-10-16T10:30:00.000Z')), true)
})

test('deployment targeting specs are deterministic and mode-scoped', () => {
  assert.deepEqual(normalizeDeploymentTargetingSpec({ targetingMode: 'DEVICES', deviceIds: ['b', 'a'], city: 'Ignored', targetPercentage: 50 }), { targetingMode: 'DEVICES', deviceIds: ['a', 'b'] })
  assert.deepEqual(normalizeDeploymentTargetingSpec({ targetingMode: 'GROUP', groupId: 'group-1', deviceIds: ['ignored'] }), { targetingMode: 'GROUP', groupId: 'group-1' })
  assert.deepEqual(normalizeDeploymentTargetingSpec({ targetingMode: 'CITY', city: ' Hyderabad ' }), { targetingMode: 'CITY', city: 'hyderabad' })
  assert.deepEqual(normalizeDeploymentTargetingSpec({ targetingMode: 'PERCENTAGE', targetPercentage: 25 }), { targetingMode: 'PERCENTAGE', targetPercentage: 25 })
})

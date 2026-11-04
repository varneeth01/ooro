import assert from 'node:assert/strict'
import test from 'node:test'
import { canWriteDeviceOs, deviceOsDeploymentRoles, deviceOsReleaseRoles } from './admin-auth.js'

test('only SUPER_ADMIN can mutate executable releases and deployment campaigns', () => {
  for (const roles of [deviceOsReleaseRoles, deviceOsDeploymentRoles]) {
    assert.deepEqual(roles, ['SUPER_ADMIN'])
    for (const role of ['ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE', 'DRIVER', undefined, null]) {
      assert.equal(role != null && roles.includes(role), false, `${String(role)} must be denied`)
    }
    assert.equal(roles.includes('SUPER_ADMIN'), true)
  }
})

test('routine DeviceOS writes retain the existing operational roles', () => {
  assert.equal(canWriteDeviceOs('ADMIN'), true)
  assert.equal(canWriteDeviceOs('OPERATIONS'), true)
  assert.equal(canWriteDeviceOs('SUPER_ADMIN'), true)
  assert.equal(canWriteDeviceOs(undefined), false)
})

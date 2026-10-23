import assert from 'node:assert/strict'
import test from 'node:test'
import { canAdmin, canWriteDeviceOs, isAdminRole } from './admin-auth.js'

test('admin authorization accepts only canonical admin roles', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE']) assert.equal(isAdminRole(role), true)
  for (const role of ['BUSINESS', 'BRAND', 'AGENCY', 'NETWORK', 'EXPLORER', 'DRIVER', undefined]) assert.equal(isAdminRole(role), false)
})

test('DeviceOS mutations require operational admin roles', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS']) assert.equal(canWriteDeviceOs(role), true)
  for (const role of ['SUPPORT', 'FINANCE', 'DRIVER', undefined]) assert.equal(canWriteDeviceOs(role), false)
})

test('campaign mutations deny finance, support and non-admin roles', () => {
  for (const role of ['FINANCE','SUPPORT','DRIVER',undefined]) {
    for (const permission of ['campaign:create','campaign:update','campaign:approve','campaign:schedule'] as const) {
      assert.equal(canAdmin(role, permission), false, `${role} must not ${permission}`)
    }
  }
  for (const role of ['ADMIN','SUPER_ADMIN']) {
    for (const permission of ['campaign:create','campaign:update','campaign:approve','campaign:schedule'] as const) {
      assert.equal(canAdmin(role, permission), true)
    }
  }
  for (const permission of ['campaign:create','campaign:update','campaign:schedule'] as const) assert.equal(canAdmin('OPERATIONS', permission), true)
  assert.equal(canAdmin('OPERATIONS', 'campaign:approve'), false)
  assert.equal(canAdmin('FINANCE','finance:read'), true)
  assert.equal(canAdmin('SUPPORT','support:read'), true)
  for (const permission of ['device:read','driver:read','ride:read','verification:read','fraud:read'] as const) {
    assert.equal(canAdmin('OPERATIONS', permission), true)
    assert.equal(canAdmin('FINANCE', permission), false)
    assert.equal(canAdmin('SUPPORT', permission), false)
  }
})

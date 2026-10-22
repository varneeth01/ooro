import assert from 'node:assert/strict'
import test from 'node:test'
import { canWriteDeviceOs, hasAdminPermission, isAdminRole } from './admin-auth.js'

test('admin authorization accepts only canonical admin roles', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE']) assert.equal(isAdminRole(role), true)
  for (const role of ['BUSINESS', 'BRAND', 'AGENCY', 'NETWORK', 'EXPLORER', 'DRIVER', undefined]) assert.equal(isAdminRole(role), false)
})

test('DeviceOS mutations require operational admin roles', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS']) assert.equal(canWriteDeviceOs(role), true)
  for (const role of ['SUPPORT', 'FINANCE', 'DRIVER', undefined]) assert.equal(canWriteDeviceOs(role), false)
})

test('campaign permission boundaries exclude finance and support writes', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS']) {
    assert.equal(hasAdminPermission(role, 'CAMPAIGN_APPROVE'), true)
    assert.equal(hasAdminPermission(role, 'CAMPAIGN_SCHEDULE'), true)
    assert.equal(hasAdminPermission(role, 'CAMPAIGN_ACTIVATE'), true)
  }
  for (const role of ['FINANCE', 'SUPPORT']) {
    for (const permission of ['CAMPAIGN_CREATE', 'CAMPAIGN_EDIT', 'CAMPAIGN_APPROVE', 'CAMPAIGN_SCHEDULE', 'CAMPAIGN_ACTIVATE', 'DEVICE_WRITE', 'NETWORK_WRITE'] as const) assert.equal(hasAdminPermission(role, permission), false)
  }
  assert.equal(hasAdminPermission('FINANCE', 'FINANCE_READ'), true)
  assert.equal(hasAdminPermission('SUPPORT', 'CAMPAIGN_READ'), true)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { isAdminRole } from './admin-auth.js'

test('admin authorization accepts only canonical admin roles', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN', 'OPERATIONS', 'SUPPORT', 'FINANCE']) assert.equal(isAdminRole(role), true)
  for (const role of ['BUSINESS', 'BRAND', 'AGENCY', 'NETWORK', 'EXPLORER', 'DRIVER', undefined]) assert.equal(isAdminRole(role), false)
})

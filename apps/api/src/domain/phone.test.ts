import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeIndianPhone } from './phone.js'

test('normalizes accepted Indian phone formats', () => {
  for (const input of ['9876543210', '09876543210', '+919876543210', '+91 9876543210', '+91 98765 43210', '91 9876543210', '919876543210', '0919876543210']) {
    assert.equal(normalizeIndianPhone(input), '+919876543210', input)
  }
})

test('rejects invalid Indian phone numbers', () => {
  for (const input of ['123', 'abcdefghij', '1234567890', '+911234567890', '987654321', '98765432100']) {
    assert.equal(normalizeIndianPhone(input), null, input)
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalProofId, canonicalProofStatus } from './proof-policy.js'

test('standalone proof remains canonical without a ride id', () => {
  assert.equal(canonicalProofId('device-proof-1'), 'device-proof-1')
  assert.equal(canonicalProofStatus(true, 10, 10), 'VALID')
})

test('ride-linked and standalone retries use the same stable proof identity', () => {
  assert.equal(canonicalProofId('proof-1', 'event-1'), 'proof-1')
  assert.equal(canonicalProofId(undefined, 'event-1'), 'event-1')
  assert.equal(canonicalProofStatus(false, 10, 10), 'FAILED')
  assert.equal(canonicalProofStatus(true, 5, 10), 'PARTIAL')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveDisplayDeliveryState } from './display-delivery.js'

test('display delivery reports grounded command and connectivity states', () => {
  assert.equal(deriveDisplayDeliveryState({ online: true, commandStatus: 'SUCCEEDED' }), 'READY')
  assert.equal(deriveDisplayDeliveryState({ online: true, commandStatus: 'DELIVERED' }), 'COMMAND_SENT')
  assert.equal(deriveDisplayDeliveryState({ online: true, commandStatus: 'QUEUED' }), 'PENDING')
  assert.equal(deriveDisplayDeliveryState({ online: false, commandStatus: 'QUEUED' }), 'OFFLINE')
  assert.equal(deriveDisplayDeliveryState({ online: false, commandStatus: 'FAILED' }), 'FAILED')
})

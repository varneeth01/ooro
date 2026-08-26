import test from 'node:test'
import assert from 'node:assert/strict'
import { assertRideTransition, stateForEvent } from './ride-state.js'
import { verifyRide } from './verification.js'
import { calculateEarnings } from './earnings.js'

test('pickup does not become advertising until verification', () => {
  assert.equal(stateForEvent('RIDE_ACCEPTED', 'DRIVER_TO_PICKUP'), 'TO_PICKUP')
  assert.equal(stateForEvent('TO_PICKUP', 'PASSENGER_PICKED_UP'), 'VERIFYING')
  assert.equal(stateForEvent('RIDE_ACCEPTED', 'RIDE_COMPLETED'), null)
  assert.throws(() => assertRideTransition('TO_PICKUP', 'ACTIVE_VERIFIED'), /cannot transition/)
})

test('automatic ride verification requires server evidence', () => {
  const result = verifyRide({ source: 'MOBILITY', eventTypes: ['PASSENGER_PICKED_UP', 'RIDE_ACTIVE'], locationCount: 2, displayOnline: true, playbackConfirmed: true, cancellationConflict: false })
  assert.equal(result.status, 'VERIFIED')
  const pending = verifyRide({ source: 'MOBILITY', eventTypes: ['PASSENGER_PICKED_UP'], locationCount: 0, displayOnline: false, playbackConfirmed: false, cancellationConflict: false })
  assert.notEqual(pending.status, 'VERIFIED')
})

test('earnings are calculated from verified ad seconds, not client amounts', () => {
  assert.equal(calculateEarnings(120, { baseMinor: 800n, perVerifiedAdMinuteMinor: 100n, peakBonusMinor: 0n }), 1000n)
})

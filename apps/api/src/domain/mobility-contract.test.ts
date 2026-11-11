import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyEvidence, isApprovedNotificationSource, providerForPackage } from './mobility-contract.js'

test('notification packages resolve only to the approved provider', () => {
  assert.equal(providerForPackage('com.ubercab.driver'), 'UBER')
  assert.equal(providerForPackage('com.olacabs.oladriver'), 'OLA')
  assert.equal(providerForPackage('com.rapido.driver'), 'RAPIDO')
  assert.equal(providerForPackage('com.example.mail'), null)
})

test('notification source validation rejects package spoofing and unknown packages', () => {
  assert.equal(isApprovedNotificationSource('UBER', 'com.ubercab.driver'), true)
  assert.equal(isApprovedNotificationSource('UBER', 'com.example.fake'), false)
  assert.equal(isApprovedNotificationSource('OLA'), false)
})

test('evidence classification preserves unknown and inferred states', () => {
  assert.equal(classifyEvidence('RIDE_ACCEPTED', 0.9), 'OBSERVED')
  assert.equal(classifyEvidence('RIDE_ACCEPTED', 0.4), 'INFERRED')
  assert.equal(classifyEvidence('NOT_A_REAL_EVENT', 1), 'UNKNOWN')
})

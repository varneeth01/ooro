import test from 'node:test'
import assert from 'node:assert/strict'
import { transitionDriverOnboarding } from './driver-onboarding.js'

test('driver applications only follow allowed status transitions', () => {
  assert.equal(transitionDriverOnboarding('CHANGES_REQUESTED', 'SUBMITTED'), 'SUBMITTED')
  assert.throws(() => transitionDriverOnboarding('PROFILE', 'APPROVED'), /Cannot move/)
  assert.equal(transitionDriverOnboarding('SUSPENDED', 'APPROVED'), 'APPROVED')
})

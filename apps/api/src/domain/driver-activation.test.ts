import test from 'node:test'
import assert from 'node:assert/strict'
import { getDriverActivationEligibility } from './driver-activation.js'

function fakePrisma(overrides: any = {}) {
  const driver = { id: 'driver-1', onboardingStatus: 'APPROVED', user: { accountStatus: 'ACTIVE' }, documents: [{ documentType: 'AADHAAR', status: 'VERIFIED' }, { documentType: 'PAN', status: 'VERIFIED' }, { documentType: 'DRIVING_LICENCE', status: 'VERIFIED' }, { documentType: 'RC', status: 'VERIFIED' }], vehicles: [{ id: 'vehicle-1', status: 'VERIFIED', displays: [{ id: 'display-1', state: 'READY' }] }], consents: [{ agreementVersionId: 'agreement-1', revokedAt: null }], permissionGrants: [{ permission: 'LOCATION', granted: true, revokedAt: null }, { permission: 'DATA_PROCESSING', granted: true, revokedAt: null }], beneficiaries: [], ...overrides }
  return { driver: { findUnique: async () => driver }, agreementVersion: { findMany: async () => [{ id: 'agreement-1', type: 'DRIVER', version: '1' }] } } as any
}

test('activation is eligible only when approval, documents, consent, permissions and vehicle pass', async () => {
  const result = await getDriverActivationEligibility(fakePrisma(), 'driver-1')
  assert.equal(result.eligible, true)
  assert.equal(result.advertisingEligible, true)
})

test('incomplete KYC blocks activation and exposes safe reason codes', async () => {
  const result = await getDriverActivationEligibility(fakePrisma({ documents: [] }), 'driver-1')
  assert.equal(result.eligible, false)
  assert.deepEqual(result.missingDocuments, ['AADHAAR', 'PAN', 'DRIVING_LICENCE', 'RC'])
  assert.ok(result.reasons.includes('DOCUMENTS_INCOMPLETE'))
})

test('revoked consent and suspended accounts block activation', async () => {
  const consentResult = await getDriverActivationEligibility(fakePrisma({ consents: [{ agreementVersionId: 'agreement-1', revokedAt: new Date() }] }), 'driver-1')
  assert.ok(consentResult.reasons.includes('AGREEMENTS_INCOMPLETE'))
  const suspendedResult = await getDriverActivationEligibility(fakePrisma({ user: { accountStatus: 'SUSPENDED' } }), 'driver-1')
  assert.ok(suspendedResult.reasons.includes('ACCOUNT_NOT_APPROVED'))
})

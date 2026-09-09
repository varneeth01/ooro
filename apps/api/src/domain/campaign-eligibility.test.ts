import test from 'node:test'
import assert from 'node:assert/strict'
import { deliveryAssetUrl, manifestVersionFromDigest } from './campaign-eligibility.js'

test('manifest versions fit persisted signed INT4 fields', () => {
  const version = manifestVersionFromDigest('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  assert.equal(version, 268435455)
  assert.ok(version > 0 && version <= 2_147_483_647)
})

test('relative asset URLs become device-fetchable URLs in development', () => {
  assert.equal(deliveryAssetUrl('/uploads/creative.png'), 'http://127.0.0.1:3000/uploads/creative.png')
  assert.equal(deliveryAssetUrl('https://cdn.example/creative.png'), 'https://cdn.example/creative.png')
})

test('configured LAN asset base replaces persisted localhost URLs', () => {
  const previous = process.env.PUBLIC_ASSET_BASE_URL
  process.env.PUBLIC_ASSET_BASE_URL = 'http://172.20.10.5:3000'
  assert.equal(deliveryAssetUrl('http://localhost:3000/uploads/creative.png'), 'http://172.20.10.5:3000/uploads/creative.png')
  if (previous === undefined) delete process.env.PUBLIC_ASSET_BASE_URL
  else process.env.PUBLIC_ASSET_BASE_URL = previous
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { deliveryAssetUrl, manifestVersionFor, manifestVersionFromDigest } from './campaign-eligibility.js'
import { safeDestination } from './qr-destination.js'

test('manifest versions fit persisted signed INT4 fields', () => {
  const version = manifestVersionFromDigest('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  assert.equal(version, 268435455)
  assert.ok(version > 0 && version <= 2_147_483_647)
})

test('relative asset URLs become device-fetchable URLs in development', () => {
  const base = process.env.PUBLIC_ASSET_BASE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:3000'
  assert.equal(deliveryAssetUrl('/uploads/creative.png'), `${base}/uploads/creative.png`)
  assert.equal(deliveryAssetUrl('https://cdn.example/creative.png'), 'https://cdn.example/creative.png')
})

test('configured LAN asset base replaces persisted localhost URLs', () => {
  const previous = process.env.PUBLIC_ASSET_BASE_URL
  process.env.PUBLIC_ASSET_BASE_URL = 'http://172.20.10.5:3000'
  assert.equal(deliveryAssetUrl('http://localhost:3000/uploads/creative.png'), 'http://172.20.10.5:3000/uploads/creative.png')
  if (previous === undefined) delete process.env.PUBLIC_ASSET_BASE_URL
  else process.env.PUBLIC_ASSET_BASE_URL = previous
})

test('manifest version changes for creative offer and layout changes but not unchanged content', () => {
  const base = { displayId: 'screen-1', layout: { type: 'AD_NAV_OFFER' }, items: [{ creativeId: 'creative-a', assetId: 'asset-a', offer: { offerTitle: 'Offer A', qrUrl: 'https://theooro.com/go/token-a' } }] }
  assert.equal(manifestVersionFor(base), manifestVersionFor(structuredClone(base)))
  assert.notEqual(manifestVersionFor(base), manifestVersionFor({ ...base, items: [{ ...base.items[0], offer: { offerTitle: 'Offer B', qrUrl: 'https://theooro.com/go/token-b' } }] }))
  assert.notEqual(manifestVersionFor(base), manifestVersionFor({ ...base, layout: { type: 'SPLIT_50_25_25' } }))
})

test('QR destinations require HTTPS outside local development', () => {
  assert.equal(safeDestination('javascript:alert(1)', false), null)
  assert.equal(safeDestination('http://evil.example/offer', false), null)
  assert.equal(safeDestination('https://example.com/offer', false), 'https://example.com/offer')
})

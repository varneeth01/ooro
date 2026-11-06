import test from 'node:test'
import assert from 'node:assert/strict'
import { authorizedAllocationWindow, deliveryAssetUrl, manifestValidUntil, MANIFEST_AUTHORIZATION_LEASE_MS, manifestVersionFor, manifestVersionFromDigest, selectManifestDeliverySlots } from './campaign-eligibility.js'
import { safeDestination } from './qr-destination.js'

test('manifest versions fit persisted signed INT4 fields', () => {
  const version = manifestVersionFromDigest('ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
  assert.equal(version, 268435455)
  assert.ok(version > 0 && version <= 2_147_483_647)
})

test('sponsored creative is selected independently and never promoted from a main slot', () => {
  const items = [
    { id: 'main-a', campaignId: 'main', type: 'IMAGE', priority: 3 },
    { id: 'sponsor-video', campaignId: 'sponsor-video', type: 'VIDEO', priority: 99 },
    { id: 'sponsor-image', campaignId: 'sponsor-image', type: 'IMAGE', priority: 2 },
  ]
  const campaigns = [{ id: 'main', deliverySlot: 'MAIN' }, { id: 'sponsor-video', deliverySlot: 'SPONSORED' }, { id: 'sponsor-image', deliverySlot: 'SPONSORED' }]
  const v3 = selectManifestDeliverySlots(items, campaigns, true)
  assert.deepEqual(v3.mainItems.map(item => item.id), ['main-a'])
  assert.equal(v3.sponsoredItem?.id, 'sponsor-image')
  const v2 = selectManifestDeliverySlots(items, campaigns, false)
  assert.deepEqual(v2.mainItems.map(item => item.id), ['main-a'])
  assert.equal(v2.sponsoredItem, null)
})

test('manifest lease is a fixed 15 minutes; creative schedule dates remain separate playback gates', () => {
  const now = new Date('2026-11-04T12:00:00.000Z')
  const until = manifestValidUntil(now)
  assert.equal(MANIFEST_AUTHORIZATION_LEASE_MS, 900_000)
  assert.equal(until.toISOString(), '2026-11-04T12:15:00.000Z')
  const campaignEndsAt = new Date('2026-11-04T12:10:00.000Z')
  assert.ok(until > campaignEndsAt) // The Android selector must still enforce item.endAt.
})

test('scheduled item validity is clipped to campaign and single-day allocation bounds', () => {
  const allocation = new Date('2026-11-05T00:00:00.000Z')
  const window = authorizedAllocationWindow(
    new Date('2026-11-05T08:00:00.000Z'),
    new Date('2026-11-06T12:00:00.000Z'),
    allocation,
    new Date('2026-11-05T09:00:00.000Z'),
    new Date('2026-11-05T20:00:00.000Z'),
  )
  assert.equal(window?.startAt.toISOString(), '2026-11-05T09:00:00.000Z')
  assert.equal(window?.endAt.toISOString(), '2026-11-05T20:00:00.000Z')
  assert.equal(authorizedAllocationWindow(new Date('2026-11-04T00:00:00.000Z'), new Date('2026-11-04T23:00:00.000Z'), allocation, new Date('2026-11-05T00:00:00.000Z'), null), null)
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
  assert.notEqual(manifestVersionFor(base), manifestVersionFor({ ...base, layout: { type: 'AD_NAV_OFFER', contractVersion: 2 } }))
})

test('QR destinations require HTTPS outside local development', () => {
  assert.equal(safeDestination('javascript:alert(1)', false), null)
  assert.equal(safeDestination('http://evil.example/offer', false), null)
  assert.equal(safeDestination('https://example.com/offer', false), 'https://example.com/offer')
})

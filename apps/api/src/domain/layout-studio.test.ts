import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizedPixelRect, standardPixelGeometry, standardV3Draft, validateLayoutDraft } from './layout-studio.js'
import { canAdmin } from './admin-auth.js'

test('layout mutation authorization excludes read-only support and finance roles', () => {
  assert.equal(canAdmin('ADMIN', 'device:write'), true)
  assert.equal(canAdmin('OPERATIONS', 'device:write'), true)
  assert.equal(canAdmin('SUPPORT', 'device:write'), false)
  assert.equal(canAdmin('FINANCE', 'device:write'), false)
})

test('Standard V3 resolves to the documented 1280x720 pixel geometry', () => {
  assert.deepEqual(standardPixelGeometry(1280, 720), {
    mainAd: { x: 0, y: 0, width: 1024, height: 612 },
    sponsoredAd: { x: 0, y: 612, width: 1024, height: 108 },
    qrOffer: { x: 1024, y: 0, width: 256, height: 360 },
    navigation: { x: 1024, y: 360, width: 256, height: 360 },
  })
})

test('normalized custom zone edge rounding matches native renderer golden vectors', () => {
  assert.deepEqual(normalizedPixelRect({ x: 0, y: 0, width: .8, height: .85 }, 854, 480), { x: 0, y: 0, width: 683, height: 408 })
  assert.deepEqual(normalizedPixelRect({ x: .8, y: .5, width: .2, height: .5 }, 1920, 1080), { x: 1536, y: 540, width: 384, height: 540 })
})

test('Standard V3 is valid and rejects geometry edits', () => {
  const standard = standardV3Draft()
  assert.deepEqual(validateLayoutDraft(standard).issues, [])
  standard.zones[0].geometry.width = .7
  assert.ok(validateLayoutDraft(standard).issues.some(issue => issue.code === 'STANDARD_LOCKED'))
})

test('Standard V3 cannot hide or crop a zone or target portrait dimensions', () => {
  const hidden = standardV3Draft()
  hidden.zones[0]!.visible = false
  assert.ok(validateLayoutDraft(hidden).issues.some(issue => issue.code === 'STANDARD_LOCKED'))

  const cropped = standardV3Draft()
  cropped.zones[0]!.fit = 'CENTER_CROP'
  assert.ok(validateLayoutDraft(cropped).issues.some(issue => issue.code === 'STANDARD_LOCKED'))

  const portrait = standardV3Draft()
  portrait.target = { width: 720, height: 1280 }
  assert.ok(validateLayoutDraft(portrait).issues.some(issue => issue.code === 'STANDARD_LOCKED'))
})

test('custom zone geometry must be normalized and bound media needs a reference', () => {
  const draft = standardV3Draft()
  draft.mode = 'CUSTOM'
  draft.preset = 'CUSTOM_CANVAS'
  draft.zones = [{ ...draft.zones[0], geometry: { x: .8, y: 0, width: .3, height: 1 }, contentBinding: { kind: 'APPROVED_CREATIVE' } }]
  const issues = validateLayoutDraft(draft).issues
  assert.ok(issues.some(issue => issue.code === 'ZONE_OUT_OF_BOUNDS'))
  assert.ok(issues.some(issue => issue.code === 'BINDING_REFERENCE_REQUIRED'))
})

test('custom publishing is blocked until the target runtime profile is certified', () => {
  const draft = standardV3Draft()
  draft.mode = 'CUSTOM'
  draft.preset = 'GRID'
  draft.zones = ['VIDEO', 'NAVIGATION_MAP', 'WEATHER'].map((type, index) => ({
    id: `zone-${index}`, type: type as 'VIDEO' | 'NAVIGATION_MAP' | 'WEATHER', label: type, schemaVersion: 1,
    geometry: { x: 0, y: index / 3, width: 1, height: 1 / 3 }, zIndex: index, fit: 'FIT', contentBinding: { kind: 'NONE' }, visible: true,
  }))
  assert.ok(validateLayoutDraft(draft).issues.some(issue => issue.code === 'CAPABILITY_PROFILE_UNVERIFIED'))
})

test('custom layout limits video decoders and billable ad slots', () => {
  const draft = standardV3Draft()
  draft.mode = 'CUSTOM'; draft.preset = 'GRID'; draft.profileId = 'OORO_PREMIUM'
  draft.zones = [
    { ...draft.zones[0]!, id: 'video-1', type: 'VIDEO', geometry: { x: 0, y: 0, width: .5, height: 1 } },
    { ...draft.zones[0]!, id: 'video-2', type: 'VIDEO', geometry: { x: .5, y: 0, width: .5, height: 1 } },
  ]
  const issues = validateLayoutDraft(draft).issues
  assert.ok(issues.some(issue => issue.code === 'VIDEO_DECODER_BUDGET_EXCEEDED'))
  draft.zones = [
    { ...draft.zones[0]!, id: 'main-1', type: 'MAIN_AD', geometry: { x: 0, y: 0, width: .5, height: 1 } },
    { ...draft.zones[1]!, id: 'main-2', type: 'MAIN_AD', geometry: { x: .5, y: 0, width: .5, height: 1 } },
  ]
  assert.ok(validateLayoutDraft(draft).issues.some(issue => issue.code === 'MULTIPLE_MAIN_AD_ZONES'))
})

test('overlapping active zones are rejected while intentional text overlays remain valid', () => {
  const draft = standardV3Draft()
  draft.mode = 'CUSTOM'; draft.preset = 'CUSTOM_CANVAS'; draft.profileId = 'OORO_PREMIUM'
  draft.zones = [
    { ...draft.zones[0]!, id: 'media', geometry: { x: 0, y: 0, width: .7, height: .7 } },
    { ...draft.zones[1]!, id: 'other-media', geometry: { x: .6, y: .6, width: .3, height: .3 } },
    { ...draft.zones[2]!, id: 'label', type: 'TEXT', geometry: { x: .1, y: .1, width: .2, height: .1 } },
  ]
  assert.ok(validateLayoutDraft(draft).issues.some(issue => issue.code === 'ZONE_OVERLAP'))
  draft.zones.splice(1, 1)
  assert.equal(validateLayoutDraft(draft).issues.some(issue => issue.code === 'ZONE_OVERLAP'), false)
})

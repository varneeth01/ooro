import { z } from 'zod'

export const layoutModes = ['STANDARD', 'CUSTOM'] as const
export const layoutPresets = ['OORO_STANDARD_V3', '65_35', '50_50', 'FULLSCREEN', 'MAIN_SIDEBAR', 'GRID', 'CUSTOM_CANVAS'] as const
export const widgetTypes = ['MAIN_AD', 'SPONSORED_AD', 'IMAGE', 'VIDEO', 'QR_OFFER', 'LOGO', 'TEXT', 'BACKGROUND_IMAGE', 'CLOCK', 'WEATHER', 'TICKER', 'NAVIGATION_MAP', 'STATIC_QR', 'EXTERNAL_DESTINATION'] as const

export const layoutZoneSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(widgetTypes),
  label: z.string().trim().min(1).max(80),
  schemaVersion: z.number().int().positive().max(10),
  geometry: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }).strict(),
  zIndex: z.number().int().min(0).max(100),
  fit: z.enum(['FIT', 'CENTER_CROP']).default('FIT'),
  contentBinding: z.object({ kind: z.enum(['NONE', 'APPROVED_CREATIVE', 'APPROVED_SPONSOR', 'AUTHORIZED_DESTINATION']), referenceId: z.string().max(100).optional() }).strict(),
  visible: z.boolean().default(true),
}).strict()

export const layoutDraftSchema = z.object({
  contractVersion: z.literal(1),
  mode: z.enum(layoutModes),
  preset: z.enum(layoutPresets),
  profileId: z.enum(['OORO_AUTO_LITE', 'OORO_PREMIUM', 'OORO_RETAIL_EVENT']),
  target: z.object({ width: z.number().int().min(320).max(7680), height: z.number().int().min(240).max(4320) }).strict(),
  zones: z.array(layoutZoneSchema).max(24),
}).strict()

export type LayoutZone = z.infer<typeof layoutZoneSchema>
export type WidgetType = typeof widgetTypes[number]
export type LayoutDraft = z.infer<typeof layoutDraftSchema>
export type LayoutIssue = { code: string; message: string; zoneId?: string }

const standardGeometry = [
  { type: 'MAIN_AD', x: 0, y: 0, width: .8, height: .85 },
  { type: 'SPONSORED_AD', x: 0, y: .85, width: .8, height: .15 },
  { type: 'QR_OFFER', x: .8, y: 0, width: .2, height: .5 },
  { type: 'NAVIGATION_MAP', x: .8, y: .5, width: .2, height: .5 },
] as const

export function standardV3Draft(): LayoutDraft {
  return {
    contractVersion: 1, mode: 'STANDARD', preset: 'OORO_STANDARD_V3', profileId: 'OORO_AUTO_LITE', target: { width: 1280, height: 720 },
    zones: standardGeometry.map((zone, index) => ({ id: `standard-${index + 1}`, type: zone.type, label: zone.type.replaceAll('_', ' '), schemaVersion: 1, geometry: { x: zone.x, y: zone.y, width: zone.width, height: zone.height }, zIndex: index, fit: 'FIT' as const, contentBinding: { kind: 'NONE' as const }, visible: true })),
  }
}

export function validateLayoutDraft(input: unknown): { draft?: LayoutDraft; issues: LayoutIssue[] } {
  const parsed = layoutDraftSchema.safeParse(input)
  if (!parsed.success) return { issues: parsed.error.issues.map(issue => ({ code: 'SCHEMA_INVALID', message: `${issue.path.join('.') || 'layout'}: ${issue.message}` })) }
  const draft = parsed.data
  const issues: LayoutIssue[] = []
  const ids = new Set<string>()
  let videoZones = 0
  let mainAdZones = 0
  let sponsorZones = 0
  const boundedWidgetZones = new Map<string, number>()
  for (const zone of draft.zones) {
    if (ids.has(zone.id)) issues.push({ code: 'DUPLICATE_ZONE_ID', zoneId: zone.id, message: 'Zone IDs must be unique.' })
    ids.add(zone.id)
    const { x, y, width, height } = zone.geometry
    if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1.000001 || y + height > 1.000001) {
      issues.push({ code: 'ZONE_OUT_OF_BOUNDS', zoneId: zone.id, message: `${zone.label} must remain within the screen with a positive size.` })
    }
    if (zone.fit === 'CENTER_CROP' && !['MAIN_AD', 'SPONSORED_AD', 'IMAGE', 'VIDEO', 'BACKGROUND_IMAGE'].includes(zone.type)) issues.push({ code: 'INVALID_FIT', zoneId: zone.id, message: 'Crop fitting is supported only for media zones.' })
    if (zone.contentBinding.kind !== 'NONE' && !zone.contentBinding.referenceId) issues.push({ code: 'BINDING_REFERENCE_REQUIRED', zoneId: zone.id, message: 'A bound content reference is required.' })
    if (zone.type === 'VIDEO') videoZones += 1
    if (zone.type === 'MAIN_AD') mainAdZones += 1
    if (zone.type === 'SPONSORED_AD') sponsorZones += 1
    if (['CLOCK', 'WEATHER', 'TICKER', 'NAVIGATION_MAP', 'QR_OFFER'].includes(zone.type)) {
      boundedWidgetZones.set(zone.type, (boundedWidgetZones.get(zone.type) ?? 0) + 1)
    }
  }
  if (videoZones > 1) issues.push({ code: 'VIDEO_DECODER_BUDGET_EXCEEDED', message: 'Layouts may contain at most one active video zone.' })
  if (mainAdZones > 1) issues.push({ code: 'MULTIPLE_MAIN_AD_ZONES', message: 'A layout may contain at most one primary campaign advertising zone.' })
  if (sponsorZones > 1) issues.push({ code: 'MULTIPLE_SPONSOR_ZONES', message: 'A layout may contain at most one independently authorized sponsored slot.' })
  for (const [type, count] of boundedWidgetZones) if (count > 1) issues.push({ code: 'WIDGET_BUDGET_EXCEEDED', message: `A layout may contain at most one ${type} zone on the current renderer.` })
  const overlayTypes = new Set(['TEXT', 'LOGO', 'CLOCK'])
  for (let left = 0; left < draft.zones.length; left += 1) for (let right = left + 1; right < draft.zones.length; right += 1) {
    const a = draft.zones[left], b = draft.zones[right]
    if (!a || !b || a.type === 'BACKGROUND_IMAGE' || b.type === 'BACKGROUND_IMAGE' || overlayTypes.has(a.type) || overlayTypes.has(b.type)) continue
    const overlaps = a.geometry.x < b.geometry.x + b.geometry.width && a.geometry.x + a.geometry.width > b.geometry.x && a.geometry.y < b.geometry.y + b.geometry.height && a.geometry.y + a.geometry.height > b.geometry.y
    if (overlaps) issues.push({ code: 'ZONE_OVERLAP', zoneId: b.id, message: `${a.label} and ${b.label} overlap. Only background, text, logo and clock overlays may layer.` })
  }
  if (draft.mode === 'STANDARD') {
    const canonical = standardV3Draft()
    if (draft.preset !== 'OORO_STANDARD_V3' || draft.profileId !== 'OORO_AUTO_LITE' || draft.target.width <= draft.target.height || draft.zones.length !== canonical.zones.length || draft.zones.some((zone, i) => {
      const expected = canonical.zones[i]
      return !expected || zone.type !== expected.type || JSON.stringify(zone.geometry) !== JSON.stringify(expected.geometry) || !zone.visible || zone.fit !== 'FIT'
    })) issues.push({ code: 'STANDARD_LOCKED', message: 'OORO Standard V3 geometry is locked and cannot be resized or rearranged.' })
  }
  if (draft.mode === 'CUSTOM') issues.push({ code: 'CAPABILITY_PROFILE_UNVERIFIED', message: `Custom layouts cannot be published for ${draft.profileId} until its runtime capabilities and resource budget are certified.` })
  return { draft, issues }
}

export function standardPixelGeometry(width: number, height: number) {
  const rect = (x: number, y: number, w: number, h: number) => normalizedPixelRect({ x, y, width: w, height: h }, width, height)
  const main = rect(0, 0, .8, .85)
  const sponsor = rect(0, .85, .8, .15)
  const qr = rect(.8, 0, .2, .5)
  const navigation = rect(.8, .5, .2, .5)
  return {
    mainAd: main,
    sponsoredAd: sponsor,
    qrOffer: qr,
    navigation,
  }
}

/** Uses edge rounding to match the Android renderer; adjacent zones share identical rounded boundaries. */
export function normalizedPixelRect(geometry: { x: number; y: number; width: number; height: number }, screenWidth: number, screenHeight: number) {
  const left = Math.round(geometry.x * screenWidth)
  const top = Math.round(geometry.y * screenHeight)
  const right = Math.round((geometry.x + geometry.width) * screenWidth)
  const bottom = Math.round((geometry.y + geometry.height) * screenHeight)
  return { x: left, y: top, width: right - left, height: bottom - top }
}

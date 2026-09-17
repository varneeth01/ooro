import { createHash } from 'node:crypto'
import { randomBytes } from 'node:crypto'
import { prisma } from '../prisma.js'
import { config } from '../config.js'

export type ManifestReason = 'NO_ASSIGNMENT' | 'DISPLAY_DISABLED' | 'NO_ACTIVE_CAMPAIGN' | 'OUTSIDE_SCHEDULE' | 'NO_ELIGIBLE_CREATIVE'
export type DisplayManifest = { manifestId: string; version: number; generatedAt: string; expiresAt: string; layout: string | { type: string; primaryWidthPercent: number; navigationHeightPercent: number }; items: Array<{ id: string; campaignId: string; creativeId: string; assetId: string; type: string; url: string; checksum: string | null; durationSeconds: number; priority: number; playsPerLoop: number; startAt: string | null; endAt: string | null; daysOfWeek: number[]; startTime: string | null; endTime: string | null; fitMode: string; offer: Record<string, unknown> }> }
// Display manifest versions are persisted in PostgreSQL INT4-backed fields.
// Seven hex digits keep the deterministic hash-derived version positive and
// within the signed 32-bit range while retaining stable change detection.
export const manifestVersionFromDigest = (digest: string) => Number.parseInt(digest.slice(0, 7), 16)
const assetBaseUrl = () => process.env.PUBLIC_ASSET_BASE_URL?.trim().replace(/\/$/, '') || (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:3000')
export const deliveryAssetUrl = (url: string) => {
  const configuredBase = assetBaseUrl()
  try {
    const parsed = new URL(url, configuredBase || 'http://127.0.0.1:3000')
    if (configuredBase && ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) return `${configuredBase}${parsed.pathname}${parsed.search}`
    if (url.startsWith('http://') || url.startsWith('https://')) return url
  } catch { /* use the configured base for a malformed/relative storage URL */ }
  return `${configuredBase}${url.startsWith('/') ? url : `/${url}`}`
}

const safeDestination = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'https:') return config.nodeEnv === 'development' && ['localhost', '127.0.0.1'].includes(parsed.hostname) ? parsed.toString() : null
    return parsed.toString()
  } catch { return null }
}

const trackingToken = () => randomBytes(24).toString('base64url')

async function trackingUrlFor(displayId: string, campaignId: string, creativeId: string, metadata: Record<string, unknown>) {
  const offer = metadata.offer && typeof metadata.offer === 'object' && !Array.isArray(metadata.offer) ? metadata.offer as Record<string, unknown> : metadata
  const destinationUrl = safeDestination(offer.ctaUrl ?? metadata.ctaUrl)
  if (!destinationUrl) return null
  const ctaType = typeof offer.ctaType === 'string' ? offer.ctaType : 'WEBSITE'
  let link = await prisma.campaignTrackingLink.findFirst({ where: { campaignId, creativeId, displayId, active: true }, orderBy: { createdAt: 'asc' } })
  if (!link) link = await prisma.campaignTrackingLink.create({ data: { token: trackingToken(), campaignId, creativeId, displayId, destinationUrl, ctaType } })
  else if (link.destinationUrl !== destinationUrl || link.ctaType !== ctaType) link = await prisma.campaignTrackingLink.update({ where: { id: link.id }, data: { destinationUrl, ctaType } })
  return `${config.trackingBaseUrl}/go/${link.token}`
}

export async function buildDisplayManifest(displayId: string, now = new Date()): Promise<{ manifest: DisplayManifest; reasons: ManifestReason[] }> {
  const display = await prisma.display.findUnique({ where: { id: displayId }, include: { campaignAssignments: { where: { active: true }, include: { campaign: { include: { creatives: { where: { status: 'ACTIVE' }, include: { asset: true } } } } } } } })
  const reasons: ManifestReason[] = []
  if (!display || !display.deviceTokenHash || display.state === 'DISABLED') return { manifest: emptyManifest(now), reasons: ['DISPLAY_DISABLED'] }
  if (!display.campaignAssignments.length) reasons.push('NO_ASSIGNMENT')
  // Scheduled campaigns are prefetched before startAt. Android's schedule
  // engine controls playback timing from the manifest item dates.
  const eligible = display.campaignAssignments.filter(({ campaign }) => ['ACTIVE', 'SCHEDULED'].includes(campaign.status) && (!campaign.endsAt || campaign.endsAt >= now))
  if (!eligible.length && display.campaignAssignments.length) reasons.push('NO_ACTIVE_CAMPAIGN')
  const items = (await Promise.all(eligible.flatMap(({ campaign }) => campaign.creatives.filter((creative) => creative.asset?.active && creative.asset.url).map(async (creative) => {
    const metadata = campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata) ? campaign.metadata as Record<string, unknown> : {}
    const offer = metadata.offer && typeof metadata.offer === 'object' && !Array.isArray(metadata.offer) ? metadata.offer as Record<string, unknown> : metadata
    const trackingUrl = await trackingUrlFor(displayId, campaign.id, creative.id, metadata)
    const indiaDayStart = new Date(`${now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}T00:00:00+05:30`)
    const scanCount = trackingUrl ? await prisma.qrScan.count({ where: { campaignId: campaign.id, creativeId: creative.id, displayId, occurredAt: { gte: indiaDayStart } } }) : null
    const schedule = metadata.adminSchedule && typeof metadata.adminSchedule === 'object' && !Array.isArray(metadata.adminSchedule) ? metadata.adminSchedule as Record<string, unknown> : metadata;
    const playsPerLoop = typeof schedule.playsPerLoop === 'number' ? Math.max(1, Math.min(28, Math.round(schedule.playsPerLoop))) : 1;
    const dayNumbers: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7 };
    const daysOfWeek = Array.isArray(schedule.days) ? schedule.days.map(day => dayNumbers[String(day).slice(0, 3).toUpperCase()]).filter((day): day is number => Boolean(day)) : [];
    return { id: creative.id, campaignId: campaign.id, creativeId: creative.id, assetId: creative.asset!.id, type: creative.type.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE', url: deliveryAssetUrl(creative.asset!.url), checksum: creative.asset!.checksum, durationSeconds: creative.durationSeconds, priority: campaign.priority, playsPerLoop, startAt: campaign.startsAt?.toISOString() ?? null, endAt: campaign.endsAt?.toISOString() ?? null, daysOfWeek, startTime: typeof schedule.startTime === 'string' ? schedule.startTime : null, endTime: typeof schedule.endTime === 'string' ? schedule.endTime : null, fitMode: typeof metadata.fitMode === 'string' ? metadata.fitMode : 'FIT', offer: { brandName: metadata.brand ?? metadata.brandName, ...offer, ...(trackingUrl ? { qrUrl: trackingUrl, scanCount, scanCountDisplayEnabled: offer.scanCountDisplayEnabled === true } : {}) } }
  })))).sort((a, b) => b.priority - a.priority || a.campaignId.localeCompare(b.campaignId) || a.id.localeCompare(b.id))
  if (!items.length && eligible.length) reasons.push('NO_ELIGIBLE_CREATIVE')
  const fingerprint = JSON.stringify({ displayId, items: items.map(({ id, campaignId, assetId, checksum, durationSeconds, priority, playsPerLoop, startAt, endAt, daysOfWeek, startTime, endTime }) => ({ id, campaignId, assetId, checksum, durationSeconds, priority, playsPerLoop, startAt, endAt, daysOfWeek, startTime, endTime })) })
  const digest = createHash('sha256').update(fingerprint).digest('hex')
  // Restore the established passenger layout for legacy campaigns that still
  // carry the old fullscreen default.
  const campaignLayout = eligible[0]?.campaign.layout ?? 'AD_NAV_OFFER'
  const layout = campaignLayout === 'FULLSCREEN_AD' || campaignLayout === 'AD_NAV_OFFER'
    ? { type: 'AD_NAV_OFFER', primaryWidthPercent: 75, navigationHeightPercent: 58 }
    : campaignLayout
  return { manifest: { manifestId: `manifest-${digest.slice(0, 24)}`, version: manifestVersionFromDigest(digest), generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(), layout, items }, reasons }
}
const emptyManifest = (now: Date): DisplayManifest => ({ manifestId: 'manifest-empty', version: 0, generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(), layout: 'FULLSCREEN_AD', items: [] })

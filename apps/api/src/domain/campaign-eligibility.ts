import { createHash } from 'node:crypto'
import { randomBytes } from 'node:crypto'
import { prisma } from '../prisma.js'
import { config } from '../config.js'
import { scheduleRules, intervalSeconds } from './scheduling.js'
import { safeDestination } from './qr-destination.js'

export type ManifestReason = 'NO_ASSIGNMENT' | 'DISPLAY_DISABLED' | 'NO_ACTIVE_CAMPAIGN' | 'OUTSIDE_SCHEDULE' | 'NO_ELIGIBLE_CREATIVE'
export type DisplayManifest = { manifestId: string; version: number; generatedAt: string; expiresAt: string; layout: string | { type: string; primaryWidthPercent: number; adHeightPercent: number; qrHeightPercent: number; newsScrollSpeed: number }; news: { scrollSpeed: number; announcements: Array<{ id: string; text: string; priority: number }> }; items: Array<{ id: string; campaignId: string; creativeId: string; assetId: string; type: string; url: string; checksum: string | null; durationSeconds: number; priority: number; playsPerLoop: number; exclusive?: boolean; sequence?: number; intervalSeconds?: number; scheduleId?: string; startAt: string | null; endAt: string | null; daysOfWeek: number[]; startTime: string | null; endTime: string | null; fitMode: string; qrEnabled: boolean; qrTargetUrl: string | null; qrLabel: string | null; qrVersion: number; offer: Record<string, unknown> }> }
// Display manifest versions are persisted in PostgreSQL INT4-backed fields.
// Seven hex digits keep the deterministic hash-derived version positive and
// within the signed 32-bit range while retaining stable change detection.
export const manifestVersionFromDigest = (digest: string) => Number.parseInt(digest.slice(0, 7), 16)
export const manifestVersionFor = (value: unknown) => manifestVersionFromDigest(createHash('sha256').update(JSON.stringify(value)).digest('hex'))
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

const trackingToken = () => randomBytes(24).toString('base64url')

async function trackingUrlFor(displayId: string, campaignId: string, creativeId: string, destination: unknown, ctaTypeValue: unknown) {
  const destinationUrl = safeDestination(destination, config.nodeEnv === 'development')
  if (!destinationUrl) return null
  const ctaType = typeof ctaTypeValue === 'string' ? ctaTypeValue : 'WEBSITE'
  let link = await prisma.campaignTrackingLink.findFirst({ where: { campaignId, creativeId, displayId, active: true }, orderBy: { createdAt: 'asc' } })
  if (!link) link = await prisma.campaignTrackingLink.create({ data: { token: trackingToken(), campaignId, creativeId, displayId, destinationUrl, ctaType } })
  else if (link.destinationUrl !== destinationUrl || link.ctaType !== ctaType) link = await prisma.campaignTrackingLink.update({ where: { id: link.id }, data: { destinationUrl, ctaType } })
  return `${config.trackingBaseUrl}/go/${link.token}`
}

export async function buildDisplayManifest(displayId: string, now = new Date()): Promise<{ manifest: DisplayManifest; reasons: ManifestReason[] }> {
  const display = await prisma.display.findUnique({ where: { id: displayId }, include: { vehicle: true, zoneConfig: true, campaignAssignments: { where: { active: true }, include: { campaign: { include: { schedule: true, creatives: { where: { status: 'APPROVED' }, include: { asset: true } } } } } } } })
  const reasons: ManifestReason[] = []
  if (!display || !display.deviceTokenHash || ['DISABLED','BLOCKED','MAINTENANCE'].includes(display.state)) return { manifest: emptyManifest(now), reasons: ['DISPLAY_DISABLED'] }
  if (!display.campaignAssignments.length) reasons.push('NO_ASSIGNMENT')
  // Scheduled campaigns are prefetched before startAt. Android's schedule
  // engine controls playback timing from the manifest item dates.
  const eligible = display.campaignAssignments.filter(({ campaign }) => ['ACTIVE', 'SCHEDULED'].includes(campaign.status) && (!campaign.endsAt || campaign.endsAt >= now))
  if (!eligible.length && display.campaignAssignments.length) reasons.push('NO_ACTIVE_CAMPAIGN')
  const items: DisplayManifest["items"] = (await Promise.all(eligible.flatMap(({ campaign }) => campaign.creatives.filter((creative) => creative.asset?.active && creative.asset.url).map(async (creative) => {
    const metadata = campaign.metadata && typeof campaign.metadata === 'object' && !Array.isArray(campaign.metadata) ? campaign.metadata as Record<string, unknown> : {}
    const offer = metadata.offer && typeof metadata.offer === 'object' && !Array.isArray(metadata.offer) ? metadata.offer as Record<string, unknown> : metadata
    const legacyOffer = metadata.offer && typeof metadata.offer === 'object' && !Array.isArray(metadata.offer) ? metadata.offer as Record<string, unknown> : metadata
    const qrEnabled = creative.qrEnabled || Boolean(legacyOffer.ctaUrl ?? metadata.ctaUrl)
    const qrTarget = creative.qrTargetUrl ?? legacyOffer.ctaUrl ?? metadata.ctaUrl
    const trackingUrl = qrEnabled ? await trackingUrlFor(displayId, campaign.id, creative.id, qrTarget, legacyOffer.ctaType ?? metadata.ctaType) : null
    const indiaDayStart = new Date(`${now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}T00:00:00+05:30`)
    const scanCount = trackingUrl ? await prisma.qrScan.count({ where: { campaignId: campaign.id, creativeId: creative.id, displayId, occurredAt: { gte: indiaDayStart } } }) : null
    const schedule = metadata.adminSchedule && typeof metadata.adminSchedule === 'object' && !Array.isArray(metadata.adminSchedule) ? metadata.adminSchedule as Record<string, unknown> : metadata;
    const playsPerLoop = typeof schedule.playsPerLoop === 'number' ? Math.max(1, Math.min(28, Math.round(schedule.playsPerLoop))) : 1;
    const dayNumbers: Record<string, number> = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7 };
    const daysOfWeek = Array.isArray(schedule.days) ? schedule.days.map(day => dayNumbers[String(day).slice(0, 3).toUpperCase()]).filter((day): day is number => Boolean(day)) : [];
    return { id: creative.id, campaignId: campaign.id, creativeId: creative.id, assetId: creative.asset!.id, type: creative.type.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE', url: deliveryAssetUrl(creative.asset!.url), checksum: creative.asset!.checksum, durationSeconds: creative.asset!.durationSeconds ?? creative.durationSeconds, priority: campaign.priority, playsPerLoop, startAt: campaign.startsAt?.toISOString() ?? null, endAt: campaign.endsAt?.toISOString() ?? null, daysOfWeek, startTime: typeof schedule.startTime === 'string' ? schedule.startTime : null, endTime: typeof schedule.endTime === 'string' ? schedule.endTime : null, fitMode: typeof metadata.fitMode === 'string' ? metadata.fitMode : 'FIT', qrEnabled: Boolean(trackingUrl), qrTargetUrl: trackingUrl, qrLabel: creative.qrLabel ?? (typeof legacyOffer.ctaLabel === 'string' ? legacyOffer.ctaLabel : null), qrVersion: creative.qrVersion, offer: { ...offer, brandName: creative.brandName ?? metadata.brand ?? metadata.brandName, promotionalText: creative.promotionalText, ...(trackingUrl ? { qrUrl: trackingUrl, scanCount, scanCountDisplayEnabled: offer.scanCountDisplayEnabled === true } : { qrUrl: null, scanCount: null }) } }
  })))).sort((a, b) => b.priority - a.priority || a.campaignId.localeCompare(b.campaignId) || a.id.localeCompare(b.id))
  const scheduledItems: DisplayManifest['items'] = []
  for (const assignment of eligible) {
    const schedule = assignment.campaign.schedule
    const campaignItems = items.filter(item => item.campaignId === assignment.campaign.id)
    if (!schedule) { scheduledItems.push(...campaignItems); continue }
    if (schedule.status !== 'PUBLISHED' || schedule.endsAt <= now) continue
    const rules = scheduleRules.parse(schedule.rules)
    // Only deliver paid/reserved dates. Prefetch remains safe for disconnected players.
    const allocations = await prisma.inventoryAllocation.findMany({ where: { campaignId: assignment.campaign.id, screenId: displayId, status: { in: ['RESERVED','ACTIVE'] }, date: { gte: new Date(schedule.startsAt.toISOString().slice(0,10)), lte: new Date(Math.min(schedule.endsAt.getTime(),now.getTime()+7*86400000)).toISOString().slice(0,10)+'T00:00:00.000Z' } }, select: {date:true}, distinct:['date'] })
    for (const allocation of allocations) {
      const start = new Date(Math.max(schedule.startsAt.getTime(), allocation.date.getTime()))
      const end = new Date(Math.min(schedule.endsAt.getTime(), allocation.date.getTime()+86400000))
      if (end <= now || end <= start) continue
      for (const [sequence,creativeId] of rules.creativeIds.entries()) {
        const item = campaignItems.find(i=>i.creativeId===creativeId)
        if (!item) continue
        const windows = rules.windows.length ? rules.windows : [{start:null,end:null}]
        for (const [windowIndex,window] of windows.entries()) scheduledItems.push({...item,id:`${schedule.id}:${allocation.date.toISOString().slice(0,10)}:${sequence}:${windowIndex}`,scheduleId:schedule.id,sequence,exclusive:schedule.exclusive,priority:schedule.priority,daysOfWeek:rules.days,startAt:start.toISOString(),endAt:end.toISOString(),startTime:window.start,endTime:window.end,intervalSeconds:intervalSeconds(rules),playsPerLoop:rules.mode==='WEIGHTED'?rules.value:rules.mode==='SHARE'?Math.max(1,Math.round(28*rules.value/100)):1,durationSeconds:item.type==='IMAGE'?rules.imageDurationSeconds:item.durationSeconds})
      }
    }
  }
  items.splice(0,items.length,...scheduledItems)
  if (!items.length && eligible.length) reasons.push('NO_ELIGIBLE_CREATIVE')
  // Restore the established passenger layout for legacy campaigns that still
  // carry the old fullscreen default.
  const configured = display.zoneConfig
  const layout = { type: 'FOUR_ZONE', primaryWidthPercent: configured?.primaryWidthPercent ?? 67, adHeightPercent: configured?.adHeightPercent ?? 86, qrHeightPercent: configured?.qrHeightPercent ?? 47, newsScrollSpeed: configured?.newsScrollSpeed ?? 42 }
  const city = display.vehicle?.city
  const announcements = await prisma.newsAnnouncement.findMany({ where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, display.vehicleId ? { OR: [{ vehicleId: null }, { vehicleId: display.vehicleId }] } : { vehicleId: null }, city ? { OR: [{ city: null }, { city }] } : { city: null }] }, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], take: 12, select: { id: true, text: true, priority: true } })
  const versionItems = items.map((item) => ({ ...item, offer: Object.fromEntries(Object.entries(item.offer).filter(([key]) => key !== 'scanCount')) }))
  const news = { scrollSpeed: layout.newsScrollSpeed, announcements }
  const digest = createHash('sha256').update(JSON.stringify({ displayId, layout, news, items: versionItems })).digest('hex')
  return { manifest: { manifestId: `manifest-${digest.slice(0, 24)}`, version: manifestVersionFromDigest(digest), generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(), layout, news, items }, reasons }
}
const emptyManifest = (now: Date): DisplayManifest => ({ manifestId: 'manifest-empty', version: 0, generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(), layout: { type: 'FOUR_ZONE', primaryWidthPercent: 67, adHeightPercent: 86, qrHeightPercent: 47, newsScrollSpeed: 42 }, news: { scrollSpeed: 42, announcements: [] }, items: [] })

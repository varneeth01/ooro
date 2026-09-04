import { createHash } from 'node:crypto'
import { prisma } from '../prisma.js'

export type ManifestReason = 'NO_ASSIGNMENT' | 'DISPLAY_DISABLED' | 'NO_ACTIVE_CAMPAIGN' | 'OUTSIDE_SCHEDULE' | 'NO_ELIGIBLE_CREATIVE'
export type DisplayManifest = { manifestId: string; version: number; generatedAt: string; expiresAt: string; layout: string; items: Array<{ id: string; campaignId: string; creativeId: string; assetId: string; type: string; url: string; checksum: string | null; durationSeconds: number; priority: number }> }

export async function buildDisplayManifest(displayId: string, now = new Date()): Promise<{ manifest: DisplayManifest; reasons: ManifestReason[] }> {
  const display = await prisma.display.findUnique({ where: { id: displayId }, include: { campaignAssignments: { where: { active: true }, include: { campaign: { include: { creatives: { where: { status: 'ACTIVE' }, include: { asset: true } } } } } } } })
  const reasons: ManifestReason[] = []
  if (!display || !display.deviceTokenHash || display.state === 'DISABLED') return { manifest: emptyManifest(now), reasons: ['DISPLAY_DISABLED'] }
  if (!display.campaignAssignments.length) reasons.push('NO_ASSIGNMENT')
  const eligible = display.campaignAssignments.filter(({ campaign }) => campaign.status === 'ACTIVE' && (!campaign.startsAt || campaign.startsAt <= now) && (!campaign.endsAt || campaign.endsAt >= now))
  if (!eligible.length && display.campaignAssignments.length) reasons.push('NO_ACTIVE_CAMPAIGN')
  const items = eligible.flatMap(({ campaign }) => campaign.creatives.filter((creative) => creative.asset?.active && creative.asset.url).map((creative) => ({ id: creative.id, campaignId: campaign.id, creativeId: creative.id, assetId: creative.asset!.id, type: creative.type.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE', url: creative.asset!.url, checksum: creative.asset!.checksum, durationSeconds: creative.durationSeconds, priority: campaign.priority }))).sort((a, b) => b.priority - a.priority || a.campaignId.localeCompare(b.campaignId) || a.id.localeCompare(b.id))
  if (!items.length && eligible.length) reasons.push('NO_ELIGIBLE_CREATIVE')
  const fingerprint = JSON.stringify({ displayId, items: items.map(({ id, campaignId, assetId, checksum, durationSeconds, priority }) => ({ id, campaignId, assetId, checksum, durationSeconds, priority })) })
  const digest = createHash('sha256').update(fingerprint).digest('hex')
  return { manifest: { manifestId: `manifest-${digest.slice(0, 24)}`, version: Number.parseInt(digest.slice(0, 8), 16), generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(), layout: eligible[0]?.campaign.layout ?? 'FULLSCREEN_AD', items }, reasons }
}
const emptyManifest = (now: Date): DisplayManifest => ({ manifestId: 'manifest-empty', version: 0, generatedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(), layout: 'FULLSCREEN_AD', items: [] })

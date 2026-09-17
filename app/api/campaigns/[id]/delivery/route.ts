import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webContext, webOwnerEmail } from "@/lib/web-owner";
import { deriveDisplayDeliveryState } from "@/apps/api/src/domain/display-delivery";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await webContext(); const ownerEmail = context?.email ?? await webOwnerEmail(); if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view delivery" } }, { status: 401 });
  const { id } = await params;
  try {
    const campaign = await webPrisma.campaign.findUnique({ where: { id }, select: { id: true, userId: true, ownerEmail: true, status: true, startsAt: true, endsAt: true, forecastSnapshot: true } });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    if (campaign.userId !== context?.account.id && campaign.ownerEmail !== ownerEmail) return NextResponse.json({ error: { message: "You do not have access to this campaign" } }, { status: 403 });
    const assignments = await webPrisma.displayCampaignAssignment.findMany({
      where: { campaignId: id, active: true },
      include: {
        display: { select: {
          id: true, name: true, state: true, manifestVersion: true,
          heartbeats: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } },
        // Manifest commands are display-level: one refresh updates every
        // assigned campaign item in the fetched manifest. Do not require a
        // campaignId payload, otherwise admin retries appear permanently stale.
        commands: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, commandType: true, createdAt: true, deliveredAt: true, acknowledgedAt: true, failedAt: true, error: true } },
        } },
        campaign: { select: { creatives: { where: { status: "ACTIVE" }, orderBy: { displayOrder: "asc" }, take: 1, select: { id: true, asset: { select: { id: true, checksum: true, url: true } } } } } },
      },
    });
    const data = assignments.map(item => { const command = item.display.commands[0]; const heartbeat = item.display.heartbeats[0]; const creative = item.campaign.creatives[0]; const online = Boolean(heartbeat && Date.now() - heartbeat.occurredAt.getTime() <= 90000); const commandStatus = command?.status ?? "PENDING_SYNC"; return { displayId: item.display.id, displayName: item.display.name, online, state: item.display.state, manifestVersion: item.display.manifestVersion, lastSync: heartbeat?.occurredAt ?? null, commandStatus, deliveryState: deriveDisplayDeliveryState({ online, commandStatus }), assetPersisted: Boolean(creative?.asset?.url), creativeId: creative?.id ?? null, assetId: creative?.asset?.id ?? null, assetChecksum: creative?.asset?.checksum ?? null, command }; });
    const proofSummary = await webPrisma.proofOfPlay.aggregate({ where: { campaignId: id }, _count: { _all: true }, _max: { playbackEndedAt: true } });
    const snapshot = campaign.forecastSnapshot && typeof campaign.forecastSnapshot === "object" ? campaign.forecastSnapshot as Record<string, unknown> : {};
    const target = Number(snapshot.targetDelivery ?? (snapshot.campaignDeliveryTarget && typeof snapshot.campaignDeliveryTarget === "object" ? (snapshot.campaignDeliveryTarget as Record<string, unknown>).high : 0)) || 0;
    const verifiedPlays = proofSummary._count._all;
    const progress = target > 0 ? Math.min(100, Math.round((verifiedPlays / target) * 100)) : 0;
    return NextResponse.json({ data, summary: { campaignId: id, status: campaign.status, verifiedPlays, estimatedPassengerImpressions: Number(snapshot.estimatedImpressionsHigh ?? 0) || 0, targetImpressions: target, deliveryProgressPercent: progress, activeFrom: campaign.startsAt, activeTo: campaign.endsAt, lastDeliveryAt: proofSummary._max.playbackEndedAt, screenDeliverySummary: { total: data.length, synced: data.filter(item => item.deliveryState === "READY").length, pending: data.filter(item => item.deliveryState !== "READY" && item.deliveryState !== "FAILED").length, failed: data.filter(item => item.deliveryState === "FAILED").length } } });
  } catch { return NextResponse.json({ error: { message: "Delivery status unavailable" } }, { status: 503 }); }
}

import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webContext, webOwnerEmail } from "@/lib/web-owner";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await webContext(); const ownerEmail = context?.email ?? await webOwnerEmail(); if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view delivery" } }, { status: 401 });
  const { id } = await params;
  try {
    const campaign = await webPrisma.campaign.findUnique({ where: { id }, select: { id: true, userId: true, ownerEmail: true, status: true, startsAt: true, endsAt: true, forecastSnapshot: true } });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    if (campaign.userId !== context?.account.id && campaign.ownerEmail !== ownerEmail) return NextResponse.json({ error: { message: "You do not have access to this campaign" } }, { status: 403 });
    const proofSummary = await webPrisma.proofOfPlay.aggregate({ where: { campaignId: id }, _count: { _all: true }, _max: { playbackEndedAt: true } });
    const snapshot = campaign.forecastSnapshot && typeof campaign.forecastSnapshot === "object" ? campaign.forecastSnapshot as Record<string, unknown> : {};
    const target = Number(snapshot.targetDelivery ?? (snapshot.campaignDeliveryTarget && typeof snapshot.campaignDeliveryTarget === "object" ? (snapshot.campaignDeliveryTarget as Record<string, unknown>).high : 0)) || 0;
    const verifiedPlays = proofSummary._count._all;
    const progress = target > 0 ? Math.min(100, Math.round((verifiedPlays / target) * 100)) : 0;
    return NextResponse.json({ data: [], summary: { campaignId: id, status: campaign.status, verifiedPlays, estimatedPassengerImpressions: Number(snapshot.estimatedImpressionsHigh ?? 0) || 0, targetImpressions: target, deliveryProgressPercent: progress, activeFrom: campaign.startsAt, activeTo: campaign.endsAt, lastDeliveryAt: proofSummary._max.playbackEndedAt } });
  } catch { return NextResponse.json({ error: { message: "Delivery status unavailable" } }, { status: 503 }); }
}

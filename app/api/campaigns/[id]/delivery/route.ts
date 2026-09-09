import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";
import { deriveDisplayDeliveryState } from "@/apps/api/src/domain/display-delivery";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerEmail = await webOwnerEmail(); if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view delivery" } }, { status: 401 });
  const { id } = await params;
  try {
    const campaign = await webPrisma.campaign.findFirst({ where: { id, ownerEmail }, select: { id: true } });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
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
    return NextResponse.json({ data: assignments.map(item => { const command = item.display.commands[0]; const heartbeat = item.display.heartbeats[0]; const creative = item.campaign.creatives[0]; const online = Boolean(heartbeat && Date.now() - heartbeat.occurredAt.getTime() <= 90000); const commandStatus = command?.status ?? "PENDING_SYNC"; return { displayId: item.display.id, displayName: item.display.name, online, state: item.display.state, manifestVersion: item.display.manifestVersion, lastSync: heartbeat?.occurredAt ?? null, commandStatus, deliveryState: deriveDisplayDeliveryState({ online, commandStatus }), assetPersisted: Boolean(creative?.asset?.url), creativeId: creative?.id ?? null, assetId: creative?.asset?.id ?? null, assetChecksum: creative?.asset?.checksum ?? null, command }; }) });
  } catch { return NextResponse.json({ error: { message: "Delivery status unavailable" } }, { status: 503 }); }
}

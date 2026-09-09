import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { storeCreative } from "@/lib/creative-storage";
import { webOwnerEmail } from "@/lib/web-owner";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);
const maxBytes = 100 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerEmail = await webOwnerEmail(); if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to upload creatives" } }, { status: 401 });
  const { id: campaignId } = await params; const body = await request.json().catch(() => null) as { fileName?: string; mimeType?: string; base64?: string; displayIds?: string[]; durationSeconds?: number; width?: number; height?: number } | null;
  if (!body?.fileName || !body.mimeType || !body.base64 || !allowed.has(body.mimeType)) return NextResponse.json({ error: { message: "Unsupported creative format" } }, { status: 422 });
  const bytes = Buffer.from(body.base64, "base64"); if (!bytes.length || bytes.length > maxBytes) return NextResponse.json({ error: { message: "Creative must be smaller than 100 MB" } }, { status: 422 });
  try {
    const campaign = await webPrisma.campaign.findFirst({ where: { id: campaignId, ownerEmail } }); if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    const targets = [...new Set(body.displayIds ?? [])]; if (!targets.length) return NextResponse.json({ error: { message: "Select at least one display" } }, { status: 422 });
    const displays = await webPrisma.display.findMany({ where: { id: { in: targets }, deviceTokenHash: { not: null }, state: { not: "DISABLED" } }, select: { id: true } });
    if (displays.length !== targets.length) return NextResponse.json({ error: { message: "One or more selected displays are unavailable" } }, { status: 422 });
    const stored = await storeCreative(bytes, body.fileName, body.mimeType);
    const type = body.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE";
    const result = await webPrisma.$transaction(async tx => {
      const creative = await tx.creative.create({ data: { campaignId, name: body.fileName!, type, durationSeconds: Math.max(1, Math.round(body.durationSeconds ?? 10)) } });
      const asset = await tx.asset.create({ data: { creativeId: creative.id, fileName: body.fileName!, storageKey: stored.storageKey, url: stored.url, checksum: stored.checksum, mimeType: body.mimeType, sizeBytes: BigInt(stored.size), width: body.width, height: body.height, durationSeconds: body.durationSeconds } });
      // Manifest refresh must survive an offline display. Heartbeat recovery
      // will deliver this queued command when the device reconnects.
      for (const display of displays) { await tx.displayCampaignAssignment.upsert({ where: { displayId_campaignId: { displayId: display.id, campaignId } }, update: { active: true }, create: { displayId: display.id, campaignId } }); await tx.displayCommand.create({ data: { displayId: display.id, commandType: "REFRESH_MANIFEST", payload: { campaignId, creativeId: creative.id, assetId: asset.id }, expiresAt: null } }); }
      return { creative, asset, displayIds: displays.map(display => display.id) };
    });
    return NextResponse.json({ data: { campaignId, assetId: result.asset.id, creativeId: result.creative.id, fileName: result.asset.fileName, mimeType: result.asset.mimeType, size: Number(result.asset.sizeBytes), checksum: result.asset.checksum, url: result.asset.url, displaysTargeted: result.displayIds.length, commandsCreated: result.displayIds.length, manifestVersion: null } }, { status: 201 });
  } catch (error) { const message = error instanceof Error && error.message === "OBJECT_STORAGE_NOT_CONFIGURED" ? "Creative storage is not configured for production" : "Creative could not be persisted"; return NextResponse.json({ error: { message } }, { status: 503 }); }
}

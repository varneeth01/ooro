import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { storeCreative } from "@/lib/creative-storage";
import { webContext, webOwnerEmail } from "@/lib/web-owner";
import { selfServeDisplayAssignmentAllowed } from "@/lib/campaign-policy";
import { prepareCreativeForPlayback } from "@/lib/creative-playback";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);
const maxBytes = 100 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await webContext(); const ownerEmail = context?.email ?? await webOwnerEmail(); if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to upload creatives" } }, { status: 401 });
  const { id: campaignId } = await params; const body = await request.json().catch(() => null) as { fileName?: string; mimeType?: string; base64?: string; displayIds?: string[]; durationSeconds?: number; width?: number; height?: number } | null;
  if (!body?.fileName || !body.mimeType || !body.base64 || !allowed.has(body.mimeType)) return NextResponse.json({ error: { message: "Unsupported creative format" } }, { status: 422 });
  const bytes = Buffer.from(body.base64, "base64"); if (!bytes.length || bytes.length > maxBytes) return NextResponse.json({ error: { message: "Creative must be smaller than 100 MB" } }, { status: 422 });
  try {
    const campaign = await webPrisma.campaign.findUnique({ where: { id: campaignId } }); if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    if (campaign.userId !== context?.account.id && campaign.ownerEmail !== ownerEmail) return NextResponse.json({ error: { message: "You do not have access to this campaign" } }, { status: 403 });
    const targets = [...new Set(body.displayIds ?? [])];
    if (!selfServeDisplayAssignmentAllowed(targets.length)) return NextResponse.json({ error: { code: "SCREEN_SELECTION_NOT_ALLOWED", message: "Campaign screens are allocated by OORO." } }, { status: 403 });
    const playbackMedia = await prepareCreativeForPlayback(bytes, body.fileName, body.mimeType);
    const stored = await storeCreative(playbackMedia.bytes, playbackMedia.fileName, playbackMedia.mimeType);
    const type = playbackMedia.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE";
    const result = await webPrisma.$transaction(async tx => {
      const durationSeconds = playbackMedia.durationSeconds ?? body.durationSeconds;
      const creative = await tx.creative.create({ data: { campaignId, name: playbackMedia.fileName, type, durationSeconds: Math.max(1, Math.round(durationSeconds ?? 10)) } });
      const asset = await tx.asset.create({ data: { creativeId: creative.id, fileName: playbackMedia.fileName, storageKey: stored.storageKey, url: stored.url, checksum: stored.checksum, mimeType: playbackMedia.mimeType, sizeBytes: BigInt(stored.size), width: playbackMedia.width, height: playbackMedia.height, durationSeconds } });
      return { creative, asset };
    });
    return NextResponse.json({ data: { campaignId, assetId: result.asset.id, creativeId: result.creative.id, fileName: result.asset.fileName, mimeType: result.asset.mimeType, size: Number(result.asset.sizeBytes), checksum: result.asset.checksum, url: result.asset.url, displaysTargeted: 0, commandsCreated: 0, manifestVersion: null } }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const clientError = ["CREATIVE_PROBE_FAILED", "CREATIVE_TRANSCODE_FAILED", "CREATIVE_NORMALIZED_SIZE_INVALID", "CREATIVE_CONTENT_TYPE_MISMATCH"].includes(code);
    const message = code === "OBJECT_STORAGE_NOT_CONFIGURED" ? "Creative storage is not configured for production" : ["CREATIVE_TRANSCODER_UNAVAILABLE", "CREATIVE_PROBE_UNAVAILABLE"].includes(code) ? "Video processing is not installed in the web service. Redeploy it with ffmpeg available, then retry." : code === "CREATIVE_NORMALIZED_SIZE_INVALID" ? "The video is too large after playback optimization. Upload a shorter or smaller video." : clientError ? "Could not prepare this media for playback. Please upload a valid JPG, PNG, WebP, MP4 or WebM file." : "Creative could not be persisted";
    return NextResponse.json({ error: { message } }, { status: clientError ? 422 : 503 });
  }
}

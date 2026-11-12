import { randomUUID } from "node:crypto";
import { prepareCreativeForPlayback } from "@/lib/creative-playback";
import { NextResponse } from "next/server";
import { requireAdminPermission, AdminAuthError } from "@/lib/auth/backend-session";
import { webPrisma } from "@/lib/web-prisma";
import { storeCreative } from "@/lib/creative-storage";
import { safeDestination } from "@/apps/api/src/domain/qr-destination";

const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);
const mimeByExtension: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", webm: "video/webm" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminPermission("creative:write");
    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    let fileName: string | undefined;
    let mimeType: string | undefined;
    let bytes: Buffer;
    let durationSeconds: number | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let qrEnabled = false;
    let qrTargetUrl: string | undefined;
    let qrLabel: string | undefined;
    let brandName: string | undefined;
    let promotionalText: string | undefined;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: { message: "Select an image or video." } }, { status: 422 });
      fileName = file.name; mimeType = file.type; bytes = Buffer.from(await file.arrayBuffer());
      durationSeconds = Number(form.get("durationSeconds") ?? 10);
      width = Number(form.get("width") ?? 0) || undefined; height = Number(form.get("height") ?? 0) || undefined;
      qrEnabled = form.get("qrEnabled") === "true";
      qrTargetUrl = String(form.get("qrTargetUrl") ?? "").trim() || undefined;
      qrLabel = String(form.get("qrLabel") ?? "").trim() || undefined;
      brandName = String(form.get("brandName") ?? "").trim() || undefined;
      promotionalText = String(form.get("promotionalText") ?? "").trim() || undefined;
    } else {
      const body = await request.json().catch(() => null) as { fileName?: string; mimeType?: string; base64?: string; durationSeconds?: number; width?: number; height?: number; brandName?: string; promotionalText?: string; qrEnabled?: boolean; qrTargetUrl?: string; qrLabel?: string } | null;
      fileName = body?.fileName; mimeType = body?.mimeType; bytes = body?.base64 ? Buffer.from(body.base64, "base64") : Buffer.alloc(0);
      durationSeconds = body?.durationSeconds; width = body?.width; height = body?.height; qrEnabled = body?.qrEnabled === true;
      qrTargetUrl = body?.qrTargetUrl?.trim() || undefined; qrLabel = body?.qrLabel?.trim() || undefined;
      brandName = body?.brandName?.trim() || undefined; promotionalText = body?.promotionalText?.trim() || undefined;
    }
    if ((!mimeType || mimeType === "application/octet-stream") && fileName) mimeType = mimeByExtension[fileName.split(".").pop()?.toLowerCase() ?? ""] ?? mimeType;
    if (!fileName || !mimeType || !allowed.has(mimeType)) return NextResponse.json({ error: { message: "Use JPG, PNG, WebP, MP4 or WebM." } }, { status: 422 });
    if (!bytes.length || bytes.length > 100 * 1024 * 1024) return NextResponse.json({ error: { message: "Creative must be smaller than 100 MB." } }, { status: 422 });
    if (!Number.isFinite(durationSeconds) || durationSeconds! < 1 || durationSeconds! > 3600) return NextResponse.json({ error: { message: "Creative duration must be between 1 and 3600 seconds." } }, { status: 422 });
    if (qrEnabled && !qrTargetUrl) return NextResponse.json({ error: { message: "A QR destination is required when QR is enabled." } }, { status: 422 });
    if (qrTargetUrl && !safeDestination(qrTargetUrl, false)) return NextResponse.json({ error: { message: "QR destination must use HTTPS." } }, { status: 422 });
    const campaign = await webPrisma.campaign.findUnique({ where: { id } });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    const campaignMetadata = campaign.metadata && typeof campaign.metadata === "object" && !Array.isArray(campaign.metadata) ? campaign.metadata as Record<string, unknown> : {};
    const campaignOffer = campaignMetadata.offer && typeof campaignMetadata.offer === "object" && !Array.isArray(campaignMetadata.offer) ? campaignMetadata.offer as Record<string, unknown> : campaignMetadata;
    if (!brandName && typeof campaignOffer.brandName === "string") brandName = campaignOffer.brandName.trim() || undefined;
    if (!promotionalText && typeof campaignOffer.promotionalText === "string") promotionalText = campaignOffer.promotionalText.trim() || undefined;
    if (!qrTargetUrl && typeof campaignOffer.ctaUrl === "string") qrTargetUrl = campaignOffer.ctaUrl.trim() || undefined;
    if (!qrLabel && typeof campaignOffer.ctaLabel === "string") qrLabel = campaignOffer.ctaLabel;
    if (!qrEnabled && qrTargetUrl) qrEnabled = true;
    const playbackMedia = await prepareCreativeForPlayback(bytes, fileName, mimeType);
    fileName = playbackMedia.fileName; mimeType = playbackMedia.mimeType; bytes = playbackMedia.bytes;
    width = playbackMedia.width; height = playbackMedia.height;
    if (playbackMedia.durationSeconds) durationSeconds = playbackMedia.durationSeconds;
    const stored = await storeCreative(bytes, fileName, mimeType);
    const result = await webPrisma.$transaction(async tx => {
      const creative = await tx.creative.create({ data: { campaignId: id, name: fileName!, type: mimeType!.startsWith("video/") ? "VIDEO" : "IMAGE", durationSeconds: Math.round(durationSeconds!), brandName, promotionalText, qrEnabled, qrTargetUrl, qrLabel } });
      const asset = await tx.asset.create({ data: { creativeId: creative.id, fileName: fileName!, storageKey: stored.storageKey, url: stored.url, checksum: stored.checksum, mimeType, sizeBytes: BigInt(stored.size), width, height, durationSeconds } });
      await tx.auditLog.create({ data: { actorId: admin.userId, actorRole: admin.role, action: "CREATIVE_UPLOADED", entityType: "Campaign", entityId: id, after: { creativeId: creative.id, fileName, mimeType, size: stored.size, checksum: stored.checksum, brandName, promotionalText, qrEnabled, qrTargetUrl, qrLabel } } });
      return { creative, asset };
    });
    return NextResponse.json({ data: { campaignId: id, creativeId: result.creative.id, assetId: result.asset.id, fileName: result.asset.fileName, mimeType: result.asset.mimeType, durationSeconds: result.creative.durationSeconds, brandName: result.creative.brandName, promotionalText: result.creative.promotionalText, qrEnabled: result.creative.qrEnabled, qrTargetUrl: result.creative.qrTargetUrl, qrLabel: result.creative.qrLabel, checksum: result.asset.checksum, url: result.asset.url } }, { status: 201 });
  } catch (error) {
    const requestId = randomUUID();
    const failure = error instanceof Error ? error.message : "UNKNOWN";
    const r2Code = /^R2_UPLOAD_FAILED_([A-Za-z0-9_]{1,48})$/.exec(failure)?.[1];
    const probeFailed = failure === "CREATIVE_PROBE_FAILED" || failure === "CREATIVE_TRANSCODE_FAILED" || failure === "CREATIVE_NORMALIZED_SIZE_INVALID";
    const probeUnavailable = failure === "CREATIVE_PROBE_UNAVAILABLE" || failure === "CREATIVE_TRANSCODER_UNAVAILABLE";
    console.error("[admin/creative-upload]", { requestId, code: r2Code ? `R2_UPLOAD_${r2Code}` : probeFailed ? "CREATIVE_PROBE_FAILED" : failure === "OBJECT_STORAGE_NOT_CONFIGURED" ? failure : "CREATIVE_UPLOAD_FAILURE", errorType: error instanceof Error ? error.name : "unknown" });
    const contentMismatch = error instanceof Error && error.message === "CREATIVE_CONTENT_TYPE_MISMATCH";
    const storageMissing = error instanceof Error && error.message === "OBJECT_STORAGE_NOT_CONFIGURED";
    const status = error instanceof AdminAuthError ? error.status : contentMismatch || probeFailed ? 422 : 503;
    const message = contentMismatch ? "This file does not match its declared media type." : probeUnavailable ? "Video processing is not installed in the web service. Redeploy it with ffmpeg available, then retry." : failure === "CREATIVE_NORMALIZED_SIZE_INVALID" ? "The video is too large after playback optimization. Upload a shorter or smaller video." : probeFailed ? "Could not prepare this media for playback. Please upload a valid JPG, PNG, WebP, MP4 or WebM file." : storageMissing ? "Creative uploads are temporarily unavailable. Please contact your OORO administrator." : r2Code === "403" || r2Code === "401" || r2Code === "AccessDenied" || r2Code === "InvalidAccessKeyId" ? "Media storage authorization failed. Check the R2 access key and bucket upload permissions, then retry." : r2Code === "SignatureDoesNotMatch" ? "R2 rejected the request signature. Check the R2 account ID, endpoint, and access key, then retry." : r2Code === "NoSuchBucket" ? "R2 could not find the configured bucket. Check the bucket name, then retry." : r2Code ? "Media storage could not accept the upload. Please try again or contact support." : status === 503 ? "Unable to upload this creative. Your campaign draft remains saved; contact support with the reference ID." : "Admin access required";
    return NextResponse.json({ error: { code: probeUnavailable ? "MEDIA_PROCESSING_UNAVAILABLE" : probeFailed ? "MEDIA_PROBE_FAILED" : storageMissing ? "STORAGE_NOT_CONFIGURED" : r2Code ? "R2_UPLOAD_UNAVAILABLE" : status === 503 ? "UPLOAD_UNAVAILABLE" : "UPLOAD_REJECTED", message }, requestId }, { status, headers: { "x-request-id": requestId, "cache-control": "no-store" } });
  }
}

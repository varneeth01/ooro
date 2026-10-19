import { NextResponse } from "next/server";
import { getAuthenticatedAdmin, AdminAuthError } from "@/lib/auth/backend-session";
import { webPrisma } from "@/lib/web-prisma";
import { safeDestination } from "@/apps/api/src/domain/qr-destination";
const safe = (value: unknown) => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? Number(item) : item));
export async function GET() { try { await getAuthenticatedAdmin(); const rows = await webPrisma.creative.findMany({ include: { asset: true, campaign: { select: { id: true, name: true, status: true } } }, orderBy: { displayOrder: "asc" } }); return NextResponse.json({ data: safe(rows) }); } catch (error) { return NextResponse.json({ error: { message: error instanceof AdminAuthError ? "Admin access required" : "Creative library unavailable" } }, { status: error instanceof AdminAuthError ? error.status : 503 }); } }
export async function PATCH(request: Request) {
 try {
  const admin = await getAuthenticatedAdmin(); const body = await request.json() as { creativeId?: string; status?: string; brandName?: string | null; promotionalText?: string | null; qrEnabled?: boolean; qrTargetUrl?: string | null; qrLabel?: string | null };
  if (!body.creativeId) return NextResponse.json({error:{message:"Creative id is required."}},{status:422});
  if (body.brandName != null && body.brandName.trim().length > 120) return NextResponse.json({error:{message:"Brand name must be 120 characters or fewer."}},{status:422});
  if (body.promotionalText != null && body.promotionalText.trim().length > 120) return NextResponse.json({error:{message:"Promotional text must be 120 characters or fewer."}},{status:422});
  if (body.status !== undefined && !["APPROVED","REJECTED","ARCHIVED","PENDING_REVIEW"].includes(body.status)) return NextResponse.json({error:{message:"Select a valid review status."}},{status:422});
  if (body.qrEnabled && !body.qrTargetUrl?.trim()) return NextResponse.json({error:{message:"A QR destination is required when QR is enabled."}},{status:422});
  if (body.qrTargetUrl && !safeDestination(body.qrTargetUrl, false)) return NextResponse.json({error:{message:"QR destination must use HTTPS."}},{status:422});
  const creative = await webPrisma.$transaction(async tx => {
   const previous = await tx.creative.findUniqueOrThrow({where:{id:body.creativeId}});
   const metadataChanged = body.brandName !== undefined || body.promotionalText !== undefined;
   const updated = await tx.creative.update({where:{id:body.creativeId},data:{status:body.status, ...(metadataChanged ? { brandName: body.brandName?.trim() || null, promotionalText: body.promotionalText?.trim() || null } : {}), ...(body.qrEnabled === undefined ? {} : { qrEnabled: body.qrEnabled, qrTargetUrl: body.qrTargetUrl?.trim() || null, qrLabel: body.qrLabel?.trim() || null, qrVersion: { increment: 1 } })}});
   const targets = await tx.displayCampaignAssignment.findMany({where:{campaignId:previous.campaignId,active:true}});
   await tx.displayCommand.createMany({data:targets.map(t=>({displayId:t.displayId,commandType:"REFRESH_MANIFEST",expiresAt:null}))});
   await tx.auditLog.create({data:{actorId:admin.userId,actorRole:admin.role,action:body.qrEnabled !== undefined ? "CREATIVE_QR_UPDATED" : metadataChanged ? "CREATIVE_PROMOTION_UPDATED" : "CREATIVE_REVIEWED",entityType:"Creative",entityId:previous.id,before:{status:previous.status, brandName: previous.brandName, promotionalText: previous.promotionalText, qrEnabled: previous.qrEnabled, qrTargetUrl: previous.qrTargetUrl},after:{status:body.status, brandName: body.brandName, promotionalText: body.promotionalText, qrEnabled: body.qrEnabled, qrTargetUrl: body.qrTargetUrl, qrLabel: body.qrLabel}}});
   return updated;
  });return NextResponse.json({data:safe(creative)});
 }catch(error){return NextResponse.json({error:{message:error instanceof AdminAuthError?"Admin access required":"Creative could not be updated"}},{status:error instanceof AdminAuthError?error.status:503});}
}

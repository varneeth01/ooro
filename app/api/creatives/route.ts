import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

export async function GET() {
  const email = await webOwnerEmail();
  if (!email) return NextResponse.json({ error: { message: "Sign in to view creatives" } }, { status: 401 });
  try {
    const campaigns = await webPrisma.campaign.findMany({ where: { ownerEmail: email }, include: { creatives: { include: { asset: true } } }, orderBy: { updatedAt: "desc" } });
    const data = campaigns.flatMap(campaign => campaign.creatives.filter(creative => creative.asset).map(creative => ({ creativeId: creative.id, campaignId: campaign.id, campaignName: campaign.name, name: creative.name, type: creative.type, status: creative.status, asset: creative.asset ? { id: creative.asset.id, fileName: creative.asset.fileName, mimeType: creative.asset.mimeType, size: typeof creative.asset.sizeBytes === "bigint" ? Number(creative.asset.sizeBytes) : creative.asset.sizeBytes, checksum: creative.asset.checksum, url: creative.asset.url, width: creative.asset.width, height: creative.asset.height, durationSeconds: creative.asset.durationSeconds } : null })));
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ error: { message: "Creative service unavailable" } }, { status: 503 }); }
}

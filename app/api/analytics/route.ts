import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

export async function GET() {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view analytics" } }, { status: 401 });
  try {
    const campaigns = await webPrisma.campaign.findMany({
      where: { ownerEmail }, orderBy: { updatedAt: "desc" },
      include: { creatives: { select: { id: true } } },
    });
    const rows = await Promise.all(campaigns.map(async campaign => ({ id: campaign.id, name: campaign.name, status: campaign.status, creativeCount: campaign.creatives.length, verifiedPlays: await webPrisma.proofOfPlay.count({ where: { campaignId: campaign.id, status: "VERIFIED" } }) })));
    return NextResponse.json({ data: { campaigns: rows, summary: { campaigns: rows.length, creatives: rows.reduce((sum, row) => sum + row.creativeCount, 0), verifiedPlays: rows.reduce((sum, row) => sum + row.verifiedPlays, 0) } } });
  } catch { return NextResponse.json({ error: { message: "Analytics service unavailable" } }, { status: 503 }); }
}

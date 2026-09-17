import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view analytics" } }, { status: 401 });
  const { id } = await params;
  try {
    const campaign = await webPrisma.campaign.findFirst({ where: { id, ownerEmail }, select: { id: true } });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    const [completedPlays, qrScans] = await Promise.all([
      webPrisma.proofOfPlay.count({ where: { campaignId: id, playbackCompleted: true } }),
      webPrisma.qrScan.count({ where: { campaignId: id } }),
    ]);
    return NextResponse.json({ data: { completedPlays, qrScans, scanRate: completedPlays === 0 ? null : (qrScans / completedPlays) * 100 } });
  } catch { return NextResponse.json({ error: { message: "QR analytics unavailable" } }, { status: 503 }); }
}

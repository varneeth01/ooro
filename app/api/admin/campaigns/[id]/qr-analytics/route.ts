import { NextResponse } from "next/server";
import { getAuthenticatedAdmin, AdminAuthError } from "@/lib/auth/backend-session";
import { webPrisma } from "@/lib/web-prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getAuthenticatedAdmin();
    const { id } = await params;
    const [completedPlays, qrScans] = await Promise.all([
      webPrisma.proofOfPlay.count({ where: { campaignId: id, playbackCompleted: true } }),
      webPrisma.qrScan.count({ where: { campaignId: id } }),
    ]);
    return NextResponse.json({ data: { completedPlays, qrScans, scanRate: completedPlays === 0 ? null : (qrScans / completedPlays) * 100 } });
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof AdminAuthError ? "Admin access required" : "QR analytics unavailable" } }, { status: error instanceof AdminAuthError ? error.status : 503 });
  }
}

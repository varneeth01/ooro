import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

export async function GET() {
  if (!(await webOwnerEmail())) return NextResponse.json({ error: { message: "Sign in to select displays" } }, { status: 401 });
  try {
    const displays = await webPrisma.display.findMany({ where: { deviceTokenHash: { not: null }, state: { not: "DISABLED" } }, select: { id: true, name: true, deviceId: true, state: true, heartbeats: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } } } });
    return NextResponse.json({ data: displays.map(display => ({ displayId: display.id, name: display.name, deviceId: display.deviceId, state: display.state, lastHeartbeatAt: display.heartbeats[0]?.occurredAt ?? null })) });
  } catch { return NextResponse.json({ error: { message: "Display service unavailable" } }, { status: 503 }); }
}

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

type CampaignAnalyticsRow = Prisma.CampaignGetPayload<{
  include: {
    creatives: { select: { id: true } };
    assignments: {
      where: { active: true };
      select: {
        displayId: true;
        display: {
          select: {
            name: true;
            state: true;
            heartbeats: {
              orderBy: { occurredAt: "desc" };
              take: 1;
              select: { occurredAt: true };
            };
          };
        };
      };
    };
  };
}>;

export async function GET() {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view analytics" } }, { status: 401 });
  try {
    const campaigns: CampaignAnalyticsRow[] = await webPrisma.campaign.findMany({
      where: { ownerEmail }, orderBy: { updatedAt: "desc" },
      include: { creatives: { select: { id: true } }, assignments: { where: { active: true }, select: { displayId: true, display: { select: { name: true, state: true, heartbeats: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } } } } } } },
    });
    const rows = campaigns.map(campaign => {
      const displays = campaign.assignments.map(assignment => { const heartbeat = assignment.display.heartbeats[0]?.occurredAt ?? null; return { id: assignment.displayId, name: assignment.display.name, state: assignment.display.state, lastHeartbeatAt: heartbeat, online: Boolean(heartbeat && Date.now() - heartbeat.getTime() < ONLINE_WINDOW_MS) }; });
      return { id: campaign.id, name: campaign.name, status: campaign.status, creativeCount: campaign.creatives.length, displays, onlineDisplays: displays.filter(display => display.online).length, totalDisplays: displays.length };
    });
    return NextResponse.json({ data: { campaigns: rows, summary: { campaigns: rows.length, creatives: rows.reduce((sum, row) => sum + row.creativeCount, 0), assignedDisplays: rows.reduce((sum, row) => sum + row.totalDisplays, 0), onlineDisplays: rows.reduce((sum, row) => sum + row.onlineDisplays, 0) } } });
  } catch { return NextResponse.json({ error: { message: "Analytics service unavailable" } }, { status: 503 }); }
}

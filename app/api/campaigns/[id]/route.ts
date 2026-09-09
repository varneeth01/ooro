import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";
import { validateCampaignDates } from "@/apps/api/src/domain/campaign-validation";

type CampaignPatch = { name?: string; description?: string; goal?: string; audience?: string; city?: string; area?: string; startDate?: string; endDate?: string; media?: string; budget?: number; currency?: string; metadata?: Record<string, unknown>; status?: "DRAFT" | "SCHEDULED" };

async function identity() { return webOwnerEmail(); }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await identity(); if (!email) return NextResponse.json({ error: { message: "Sign in to view campaigns" } }, { status: 401 });
  const { id } = await params;
  try {
    const campaign = await webPrisma.campaign.findFirst({ where: { id, ownerEmail: email }, include: { creatives: { include: { asset: true } }, assignments: { where: { active: true }, include: { display: { select: { id: true, name: true, state: true, manifestVersion: true, heartbeats: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } } } } } } } });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    const serializable = JSON.parse(JSON.stringify(campaign, (_key, value) => typeof value === "bigint" ? Number(value) : value));
    return NextResponse.json({ data: serializable });
  } catch { return NextResponse.json({ error: { message: "Campaign service unavailable" } }, { status: 503 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const email = await identity(); if (!email) return NextResponse.json({ error: { message: "Sign in to update campaigns" } }, { status: 401 });
  const { id } = await params; const input = await request.json().catch(() => null) as CampaignPatch | null;
  try {
    const existing = await webPrisma.campaign.findFirst({ where: { id, ownerEmail: email } });
    if (!existing) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    const dateError = validateCampaignDates(input ?? {}); if (dateError) return NextResponse.json({ error: { message: dateError } }, { status: 422 });
    const startsAt = input?.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined;
    const endsAt = input?.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : undefined;
    const campaign = await webPrisma.campaign.update({ where: { id }, data: {
      name: input?.name?.trim() || undefined, description: typeof input?.description === "string" ? input.description : undefined,
      status: input?.status, startsAt, endsAt, timezone: typeof input?.metadata?.timezone === "string" ? input.metadata.timezone : undefined,
      layout: typeof input?.media === "string" ? input.media : undefined,
      metadata: input?.metadata ? { ...(existing.metadata as Record<string, unknown> | null ?? {}), ...input.metadata, goal: input.goal, audience: input.audience, city: input.city, area: input.area, media: input.media, budget: input.budget, currency: input.currency } : undefined,
    } });
    return NextResponse.json({ data: campaign });
  } catch { return NextResponse.json({ error: { message: "Campaign could not be updated" } }, { status: 503 }); }
}

import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webContext, webOwnerEmail } from "@/lib/web-owner";
import { validateCampaignDates } from "@/apps/api/src/domain/campaign-validation";

type CampaignPatch = { name?: string; description?: string; goal?: string; audience?: string; city?: string; area?: string; startDate?: string; endDate?: string; media?: string; budget?: number; currency?: string; metadata?: Record<string, unknown>; status?: "DRAFT" | "SCHEDULED"; campaignCenterLat?: number; campaignCenterLng?: number; radiusKm?: number; forecastSnapshot?: Record<string, unknown>; forecastGeneratedAt?: string; forecastExpiresAt?: string; forecastVersion?: string; deliveryTier?: "STANDARD" | "PREMIUM_PLUS" };

async function identity() { return webOwnerEmail(); }

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await webContext(); const email = context?.email ?? await identity(); if (!email) return NextResponse.json({ error: { message: "Sign in to view campaigns" } }, { status: 401 });
  const { id } = await params;
  try {
    const campaign = await webPrisma.campaign.findUnique({ where: { id }, include: { creatives: { where: { status: "ACTIVE" }, orderBy: { displayOrder: "asc" }, include: { asset: true } }, assignments: { where: { active: true }, include: { display: { select: { id: true, name: true, state: true, manifestVersion: true, heartbeats: { orderBy: { occurredAt: "desc" }, take: 1, select: { occurredAt: true } } } } } } } });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    if (campaign.userId !== context?.account.id && campaign.ownerEmail !== email) return NextResponse.json({ error: { message: "You do not have access to this campaign" } }, { status: 403 });
    const serializable = JSON.parse(JSON.stringify({ ...campaign, pricingSnapshot: campaign.pricingSnapshot ? { customerType: (campaign.pricingSnapshot as Record<string, unknown>).customerType, plan: (campaign.pricingSnapshot as Record<string, unknown>).plan, budget: (campaign.pricingSnapshot as Record<string, unknown>).budget } : null }, (_key, value) => typeof value === "bigint" ? Number(value) : value));
    return NextResponse.json({ data: serializable });
  } catch { return NextResponse.json({ error: { message: "Campaign service unavailable" } }, { status: 503 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await webContext(); const email = context?.email ?? await identity(); if (!email) return NextResponse.json({ error: { message: "Sign in to update campaigns" } }, { status: 401 });
  const { id } = await params; const input = await request.json().catch(() => null) as CampaignPatch | null;
  try {
    const existing = await webPrisma.campaign.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    if (existing.userId !== context?.account.id && existing.ownerEmail !== email) return NextResponse.json({ error: { message: "You do not have access to this campaign" } }, { status: 403 });
    const dateError = validateCampaignDates(input ?? {}); if (dateError) return NextResponse.json({ error: { message: dateError } }, { status: 422 });
    const startsAt = input?.startDate ? new Date(`${input.startDate}T00:00:00.000Z`) : undefined;
    const endsAt = input?.endDate ? new Date(`${input.endDate}T23:59:59.999Z`) : undefined;
    const campaign = await webPrisma.campaign.update({ where: { id }, data: {
      name: input?.name?.trim() || undefined, description: typeof input?.description === "string" ? input.description : undefined,
      status: input?.status, startsAt, endsAt, timezone: typeof input?.metadata?.timezone === "string" ? input.metadata.timezone : undefined,
      layout: typeof input?.media === "string" ? input.media : undefined,
      campaignCenterLat: input?.campaignCenterLat, campaignCenterLng: input?.campaignCenterLng, radiusKm: input?.radiusKm,
      forecastSnapshot: input?.forecastSnapshot ? JSON.parse(JSON.stringify(input.forecastSnapshot)) : undefined, forecastGeneratedAt: input?.forecastGeneratedAt ? new Date(input.forecastGeneratedAt) : undefined, forecastExpiresAt: input?.forecastExpiresAt ? new Date(input.forecastExpiresAt) : undefined, forecastVersion: input?.forecastVersion, deliveryTier: input?.deliveryTier,
      metadata: input?.metadata ? { ...(existing.metadata as Record<string, unknown> | null ?? {}), ...input.metadata, goal: input.goal, audience: input.audience, city: input.city, area: input.area, media: input.media, budget: input.budget, currency: input.currency } : undefined,
    } });
    return NextResponse.json({ data: campaign });
  } catch { return NextResponse.json({ error: { message: "Campaign could not be updated" } }, { status: 503 }); }
}

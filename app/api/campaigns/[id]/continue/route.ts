import { NextResponse } from "next/server";
import { validateCampaignContinuation } from "@/apps/api/src/domain/campaign-transition";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";
import { dateKeys, slotCandidates } from "@/apps/api/src/domain/inventory";
import { isForecastFresh } from "@/apps/api/src/domain/forecast-integrity";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to continue this campaign" } }, { status: 401 });
  const { id } = await params;

  try {
    const campaign = await webPrisma.campaign.findFirst({
      where: { id, ownerEmail },
      include: {
        creatives: { where: { status: "ACTIVE" }, include: { asset: true }, take: 1 },
        assignments: { where: { active: true }, select: { id: true, displayId: true } },
      },
    });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });
    if (campaign.pricingSource === "PUBLIC_SELF_SERVE") {
      const paidOrder = await webPrisma.guestCampaignOrder.findFirst({ where: { campaignId: campaign.id, ownerEmail, status: { in: ["PAID", "PAYMENT_VERIFIED", "CAMPAIGN_PENDING_REVIEW"] } }, orderBy: { createdAt: "desc" } });
      if (!paidOrder) return NextResponse.json({ error: { code: "PAYMENT_REQUIRED", message: "Complete verified payment before reserving self-serve inventory." } }, { status: 402 });
      const reserved = await webPrisma.inventoryAllocation.count({ where: { campaignId: campaign.id, status: { in: ["RESERVED", "ACTIVE"] } } });
      return NextResponse.json({ data: { id: campaign.id, status: campaign.status, name: campaign.name, startsAt: campaign.startsAt, endsAt: campaign.endsAt, transition: "PAYMENT_CONFIRMED", deliveryQueued: reserved > 0 } });
    }
    if (campaign.campaignCenterLat !== null && campaign.campaignCenterLng !== null && campaign.radiusKm !== null && !isForecastFresh(campaign.forecastGeneratedAt, new Date(), (await webPrisma.forecastSetting.findUnique({ where: { key: "DEFAULT" } }))?.forecastTtlMinutes ?? 15)) {
      console.warn("FORECAST_REVALIDATION_FAILED", campaign.id);
      return NextResponse.json({ error: { code: "FORECAST_EXPIRED", message: "Campaign availability has changed since your estimate was created. Refresh the forecast before continuing." } }, { status: 409 });
    }

    const metadata = campaign.metadata && typeof campaign.metadata === "object" && !Array.isArray(campaign.metadata)
      ? campaign.metadata as Record<string, unknown>
      : {};
    const validationError = validateCampaignContinuation({
      status: campaign.status,
      hasCreative: Boolean(campaign.creatives[0]?.asset),
      activeDisplayCount: campaign.assignments.length,
      startDate: campaign.startsAt?.toISOString().slice(0, 10),
      endDate: campaign.endsAt?.toISOString().slice(0, 10),
      budget: metadata.budget,
    });
    if (validationError) return NextResponse.json({ error: { message: validationError } }, { status: 422 });

    // No delivery commands are created here. Upload already queued the manifest
    // refresh, so retries only transition the campaign and never duplicate work.
    const existingAllocations = await webPrisma.inventoryAllocation.count({ where: { campaignId: campaign.id, status: { in: ["HELD", "RESERVED", "ACTIVE"] } } });
    if (!existingAllocations && campaign.startsAt && campaign.endsAt) {
      const tier = metadata.deliveryTier === "PREMIUM_PLUS" ? "PREMIUM_PLUS" : "STANDARD";
      try {
        await webPrisma.$transaction(async tx => {
          for (const assignment of campaign.assignments) {
            const config = await tx.screenInventoryConfig.upsert({ where: { screenId: assignment.displayId }, update: {}, create: { screenId: assignment.displayId } });
            const dates = dateKeys(campaign.startsAt!, campaign.endsAt!);
            for (const date of dates) {
              const occupied = await tx.inventoryAllocation.findMany({ where: { screenId: assignment.displayId, date: new Date(`${date}T00:00:00.000Z`), status: { in: ["HELD", "RESERVED", "ACTIVE", "BLOCKED"] } }, select: { slot: true } });
              const occupiedSlots = new Set(occupied.map(item => item.slot));
              const slot = slotCandidates(Math.min(config.totalSlots, config.commercialSlots + config.houseSlots + config.blockedSlots), config.premiumSlots, tier).find(candidate => candidate < config.commercialSlots && !occupiedSlots.has(candidate));
              if (slot === undefined) throw new Error("INVENTORY_CAPACITY_EXCEEDED");
              await tx.inventoryAllocation.create({ data: { campaignId: campaign.id, screenId: assignment.displayId, date: new Date(`${date}T00:00:00.000Z`), slot, rate: campaign.effectiveRate, pricingSource: campaign.pricingSource ?? (tier === "PREMIUM_PLUS" ? "PREMIUM_PLUS" : "STANDARD"), status: "RESERVED" } });
            }
          }
        });
      } catch (error) { if (error instanceof Error && error.message === "INVENTORY_CAPACITY_EXCEEDED") return NextResponse.json({ error: { message: "Selected inventory is unavailable for the requested dates. Change dates or request custom inventory." } }, { status: 409 }); return NextResponse.json({ error: { message: "Inventory could not be reserved safely. Please try again." } }, { status: 409 }); }
    }
    const updated = campaign.status === "SCHEDULED" || campaign.status === "ACTIVE"
      ? { id: campaign.id, status: campaign.status, name: campaign.name, startsAt: campaign.startsAt, endsAt: campaign.endsAt }
      : await webPrisma.campaign.update({ where: { id: campaign.id }, data: { status: "SCHEDULED" } });
    return NextResponse.json({ data: { id: updated.id, status: updated.status, name: updated.name, startsAt: updated.startsAt, endsAt: updated.endsAt, transition: "CONTINUE_SETUP", deliveryQueued: true } });
  } catch {
    return NextResponse.json({ error: { message: "Campaign could not continue" } }, { status: 503 });
  }
}

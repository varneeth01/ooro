import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";
import { MIN_SELF_SERVE_BUDGET_RUPEES } from "@/lib/campaign-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await webContext();
  if (!context) return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "Sign in before launching" } }, { status: 401 });
  if (context.account.accountType !== "BUSINESS") return NextResponse.json({ error: { code: "BUSINESS_ACCOUNT_REQUIRED", message: "Self-serve launch is available to Business accounts." } }, { status: 403 });
  const { id } = await params;
  const campaign = await webPrisma.campaign.findFirst({ where: { id, userId: context.account.id }, include: { creatives: { where: { status: "ACTIVE" }, include: { asset: true }, take: 1 } } });
  if (!campaign) return NextResponse.json({ error: { code: "CAMPAIGN_NOT_FOUND", message: "Campaign not found" } }, { status: 404 });
  const metadata = campaign.metadata && typeof campaign.metadata === "object" && !Array.isArray(campaign.metadata) ? campaign.metadata as Record<string, unknown> : {};
  const budget = Math.round(Number(metadata.budget));
  if (!Number.isInteger(budget) || budget < MIN_SELF_SERVE_BUDGET_RUPEES) return NextResponse.json({ error: { code: "MINIMUM_BUDGET", message: `Minimum OORO campaign budget is ₹${MIN_SELF_SERVE_BUDGET_RUPEES}.` } }, { status: 422 });
  if (!campaign.startsAt || !campaign.endsAt || !campaign.radiusKm || campaign.campaignCenterLat === null || campaign.campaignCenterLng === null || !campaign.creatives[0]?.asset) return NextResponse.json({ error: { code: "CAMPAIGN_NOT_READY", message: "Complete schedule, targeting and creative before launch." } }, { status: 422 });
  const result = await webPrisma.$transaction(async tx => {
    const existing = await tx.adBalanceLedgerEntry.findUnique({ where: { idempotencyKey: `campaign-debit:${id}` } });
    if (existing) return { insufficient: false, assigned: 0, alreadyLaunched: true };
    const account = await tx.adBalanceAccount.upsert({ where: { accountId: context.account.id }, update: {}, create: { accountId: context.account.id } });
    const amountPaise = BigInt(budget * 100);
    const debited = await tx.adBalanceAccount.updateMany({ where: { id: account.id, cachedBalancePaise: { gte: amountPaise } }, data: { cachedBalancePaise: { decrement: amountPaise } } });
    if (debited.count !== 1) return { insufficient: true, availableBalancePaise: account.cachedBalancePaise };
    await tx.adBalanceLedgerEntry.create({ data: { accountId: account.id, type: "CAMPAIGN_DEBIT", amountPaise: -amountPaise, campaignId: id, idempotencyKey: `campaign-debit:${id}` } });
    const city = String(metadata.city ?? "").trim();
    const screens = await tx.display.findMany({ where: { state: { not: "DISABLED" }, inventoryConfig: { commercialEnabled: true, ...(city ? { city: { equals: city, mode: "insensitive" } } : {}) } }, select: { id: true } });
    if (screens.length) {
      await tx.displayCampaignAssignment.createMany({ data: screens.map(screen => ({ campaignId: id, displayId: screen.id, active: true })), skipDuplicates: true });
      await tx.displayCommand.createMany({ data: screens.map(screen => ({ displayId: screen.id, commandType: "SYNC_MANIFEST", payload: { campaignId: id }, expiresAt: null })) });
    }
    await tx.campaign.update({ where: { id }, data: { status: campaign.startsAt! > new Date() ? "SCHEDULED" : "ACTIVE", commercialFundingStatus: "FUNDED", metadata: { ...metadata, allocationStatus: screens.length ? "ALLOCATED" : "AWAITING_ALLOCATION" } } });
    return { insufficient: false, assigned: screens.length, availableBalancePaise: account.cachedBalancePaise - amountPaise };
  });
  if (result.insufficient) return NextResponse.json({ error: { code: "INSUFFICIENT_AD_BALANCE", message: "Add funds to your OORO Ad Balance before launch." }, data: { campaignBudget: budget, availableBalance: Number(result.availableBalancePaise) / 100, requiredTopUp: budget - Number(result.availableBalancePaise) / 100 } }, { status: 409 });
  console.info("CAMPAIGN_BALANCE_DEBITED", { campaignId: id, accountId: context.account.id });
  return NextResponse.json({ data: { campaignId: id, status: "FUNDED", allocationStatus: result.assigned ? "ALLOCATED" : "AWAITING_ALLOCATION", assignedScreens: result.assigned } });
}

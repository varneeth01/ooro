import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { verifiedOrganization } from "@/lib/organization-access";
export const dynamic = "force-dynamic";
export async function GET() { const context = await verifiedOrganization("AGENCY"); if (!context) return NextResponse.json({ error: { message: "Agency approval is required" } }, { status: 403 }); const data = await webPrisma.campaign.findMany({ where: { agencyOrganizationId: context.organization.id }, orderBy: { updatedAt: "desc" } }); return NextResponse.json({ data }); }
export async function POST(request: Request) {
  const context = await verifiedOrganization("AGENCY");
  if (!context) return NextResponse.json({ error: { message: "Agency approval is required" } }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const clientId = String(body?.agencyClientId ?? "");
  const name = String(body?.name ?? "").trim();
  const planId = String(body?.pricingPlanId ?? "");
  const city = String(body?.city ?? "").trim();
  const autos = Math.floor(Number(body?.autos));
  const days = Math.floor(Number(body?.days));
  if (!clientId || !name || !planId || !Number.isFinite(autos) || autos < 1 || !Number.isFinite(days) || days < 1) {
    return NextResponse.json({ error: { message: "Client, campaign name, plan, positive auto count and campaign duration are required" } }, { status: 422 });
  }
  const client = await webPrisma.agencyClient.findFirst({ where: { id: clientId, agencyOrganizationId: context.organization.id } });
  if (!client) return NextResponse.json({ error: { message: "Client not found" } }, { status: 404 });
  const plan = await webPrisma.pricingPlan.findFirst({ where: { id: planId, customerType: "AGENCY", active: true, commitmentMonths: { not: null } }, include: { overrides: { where: { organizationId: context.organization.id, effectiveFrom: { lte: new Date() }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }] }, orderBy: { effectiveFrom: "desc" }, take: 1 } } });
  if (!plan || !plan.autoDayRate || !plan.commitmentMonths) return NextResponse.json({ error: { message: "Agency pricing plan unavailable" } }, { status: 422 });
  const minimumDays = plan.commitmentMonths * 30;
  if (days < minimumDays) return NextResponse.json({ error: { message: `This plan requires at least ${minimumDays} campaign days (${plan.commitmentMonths} month${plan.commitmentMonths === 1 ? "" : "s"}).` } }, { status: 422 });
  const effectiveRate = plan.overrides[0]?.customRate ?? plan.autoDayRate;
  const total = autos * days * effectiveRate;
  const data = await webPrisma.campaign.create({ data: {
    ownerEmail: context.email,
    name,
    status: "DRAFT",
    agencyOrganizationId: context.organization.id,
    agencyClientId: client.id,
    pricingPlanId: plan.id,
    pricingSource: plan.deliveryTier === "PREMIUM_PLUS" ? "PREMIUM_PLUS" : plan.overrides[0] ? "ORGANIZATION_OVERRIDE" : "DEFAULT_AGENCY",
    effectiveRate,
    pricingSnapshot: { customerType: "AGENCY", plan: plan.name, commitmentMonths: plan.commitmentMonths, deliveryTier: plan.deliveryTier, baseRate: plan.autoDayRate, effectiveRate, customPricing: Boolean(plan.overrides[0]), units: autos, days, total },
    metadata: { city, autos, days, budget: total, estimatedPassengerOpportunities: autos * days * 24 },
    deliveryTier: plan.deliveryTier === "PREMIUM_PLUS" ? "PREMIUM_PLUS" : "STANDARD",
  } });
  return NextResponse.json({ data }, { status: 201 });
}

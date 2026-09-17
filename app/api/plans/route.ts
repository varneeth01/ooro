import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";
import { canAccessPricing } from "@/apps/api/src/domain/advertiser-access";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await webContext();
  const publicPlans = await webPrisma.pricingPlan.findMany({ where: { active: true, isPublic: true }, orderBy: [{ customerType: "asc" }, { impressionRate: "asc" }] });
  // Public self-serve plans intentionally omit internal economics. Forecasting is
  // exposed through /api/campaigns/forecast as delivery, not a rate card.
  const plans = publicPlans.map(plan => ({ id: plan.id, name: plan.name, customerType: plan.customerType, commitmentMonths: plan.commitmentMonths, access: "PUBLIC" }));
  if (!context?.organization) return NextResponse.json({ data: plans, account: null });
  const org = context.organization;
  const agencyApplicationStatus = (await webPrisma.agencyProfile.findUnique({ where: { organizationId: org.id } }))?.applicationStatus;
  const verifiedBrand = canAccessPricing({ organizationType: org.type, verificationStatus: org.verificationStatus }, "BRAND");
  const verifiedAgency = canAccessPricing({ organizationType: org.type, verificationStatus: org.verificationStatus, agencyApplicationStatus }, "AGENCY");
  if (!verifiedBrand && !verifiedAgency) return NextResponse.json({ data: plans, account: { type: org.type, verificationStatus: org.verificationStatus, access: "PENDING" } });
  const customerType = verifiedAgency ? "AGENCY" : "BRAND";
  const privatePlans = await webPrisma.pricingPlan.findMany({ where: { active: true, customerType }, include: { overrides: { where: { organizationId: org.id, effectiveFrom: { lte: new Date() }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }] }, orderBy: { effectiveFrom: "desc" }, take: 1 } }, orderBy: { commitmentMonths: "asc" } });
  return NextResponse.json({ data: [...plans, ...privatePlans.map(plan => ({ id: plan.id, name: plan.name, customerType: plan.customerType, commitmentMonths: plan.commitmentMonths, impressionRate: null, autoDayRate: plan.overrides[0]?.customRate ?? plan.autoDayRate, customPricing: Boolean(plan.overrides[0]), access: "VERIFIED" }))], account: { type: org.type, verificationStatus: org.verificationStatus, access: "VERIFIED" } });
}

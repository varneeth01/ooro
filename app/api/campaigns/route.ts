import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";
import { validateCampaignDates } from "@/apps/api/src/domain/campaign-validation";
import { MIN_SELF_SERVE_BUDGET_RUPEES } from "@/lib/campaign-policy";
import { webContext } from "@/lib/web-owner";

type CampaignInput = {
  name?: string; description?: string; goal?: string; audience?: string; city?: string; area?: string;
  startDate?: string; endDate?: string; media?: string; budget?: number; currency?: string;
  metadata?: Record<string, unknown>; status?: "DRAFT" | "SCHEDULED";
  pricingPlanId?: string; deliveryTier?: "STANDARD" | "PREMIUM_PLUS";
  campaignCenterLat?: number; campaignCenterLng?: number; radiusKm?: number;
  forecastSnapshot?: Record<string, unknown>; forecastGeneratedAt?: string; forecastExpiresAt?: string; forecastVersion?: string;
};

async function owner() {
  return webOwnerEmail();
}

function validate(input: CampaignInput, partial = false) {
  if (!input.name?.trim()) return "Campaign name is required";
  if (!partial && (!input.goal?.trim() || !input.audience?.trim() || !input.city?.trim() || !input.area?.trim())) return "Goal, audience, city and area are required";
  if (!partial && (!input.startDate || !input.endDate)) return "Start and end dates are required";
  const dateError = validateCampaignDates(input); if (dateError) return dateError;
  if (input.budget !== undefined && (!Number.isFinite(input.budget) || input.budget <= 0)) return "Budget must be greater than zero";
  if (input.radiusKm !== undefined && (!Number.isFinite(input.radiusKm) || input.radiusKm < 1 || input.radiusKm > 10)) return "Radius must be between 1 km and 10 km";
  if (input.campaignCenterLat !== undefined && (!Number.isFinite(input.campaignCenterLat) || input.campaignCenterLat < -90 || input.campaignCenterLat > 90)) return "Campaign latitude is invalid";
  if (input.campaignCenterLng !== undefined && (!Number.isFinite(input.campaignCenterLng) || input.campaignCenterLng < -180 || input.campaignCenterLng > 180)) return "Campaign longitude is invalid";
  return null;
}

export async function GET() {
  const email = await owner();
  if (!email) return NextResponse.json({ error: { message: "Sign in to view campaigns" } }, { status: 401 });
  try {
    const context = await webContext();
    if (context?.account.accountType === "NETWORK" || context?.account.accountType === "EXPLORER") return NextResponse.json({ error: { code: "ADVERTISER_ACCESS_REQUIRED", message: "This account does not have advertiser campaign access." } }, { status: 403 });
    if (context?.account.accountType === "BRAND" && (!context.organization || context.organization.verificationStatus !== "VERIFIED")) return NextResponse.json({ error: { code: "BRAND_VERIFICATION_REQUIRED", message: "Your Brand account is awaiting verification." } }, { status: 403 });
    if (context?.account.accountType === "AGENCY" && (!context.organization || context.organization.verificationStatus !== "VERIFIED")) return NextResponse.json({ error: { code: "AGENCY_APPROVAL_REQUIRED", message: "Your Agency application is being reviewed." } }, { status: 403 });
    const campaigns = await webPrisma.campaign.findMany({ where: { OR: [{ ownerEmail: email }, ...(context?.account.id ? [{ userId: context.account.id }] : [])] }, orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ data: campaigns });
  } catch (error) { console.error("[campaigns] list failed", error); return NextResponse.json({ error: { code: "CAMPAIGN_SERVICE_UNAVAILABLE", message: "Campaign service unavailable" } }, { status: 503 }); }
}

export async function POST(request: Request) {
  const email = await owner();
  if (!email) return NextResponse.json({ error: { message: "Sign in to save campaigns" } }, { status: 401 });
  const input = await request.json().catch(() => null) as CampaignInput | null;
  const error = validate(input ?? {}, input?.status === "DRAFT");
  if (error) return NextResponse.json({ error: { message: error } }, { status: 422 });
  try {
    const context = await webContext();
    const forecastSettings = await webPrisma.forecastSetting.findUnique({ where: { key: "DEFAULT" } });
    const isSelfServe = !context?.organization || context.organization.type === "CONSUMER";
    if (input?.budget !== undefined && isSelfServe && input.budget < (forecastSettings?.minimumSelfServeBudget ?? MIN_SELF_SERVE_BUDGET_RUPEES)) return NextResponse.json({ error: { code: "MINIMUM_BUDGET", message: `Minimum OORO campaign budget is ₹${forecastSettings?.minimumSelfServeBudget ?? MIN_SELF_SERVE_BUDGET_RUPEES}.` } }, { status: 422 });
    const requestedPlan = input?.pricingPlanId ? await webPrisma.pricingPlan.findFirst({ where: { id: input.pricingPlanId, active: true } }) : null;
    if (input?.pricingPlanId && !requestedPlan) return NextResponse.json({ error: { message: "Pricing plan is unavailable" } }, { status: 422 });
    const verifiedPrivate = Boolean(context?.organization && context.organization.verificationStatus === "VERIFIED" && ["BRAND", "AGENCY"].includes(context.organization.type));
    if (requestedPlan && ((requestedPlan.customerType === "SELF_SERVE" && !requestedPlan.isPublic) || (requestedPlan.customerType !== "SELF_SERVE" && (!verifiedPrivate || requestedPlan.customerType !== context?.organization?.type)))) return NextResponse.json({ error: { message: "This pricing plan is not available for your account" } }, { status: 403 });
    const rate = requestedPlan?.customerType === "SELF_SERVE" ? requestedPlan.impressionRate : requestedPlan?.autoDayRate;
    const metadata = { goal: input!.goal, audience: input!.audience, city: input!.city, area: input!.area, media: input!.media, budget: input!.budget, currency: input!.currency, ...input!.metadata };
    const campaign = await webPrisma.campaign.create({ data: {
      ownerEmail: email, userId: context?.account.id, name: input!.name!.trim(), description: input!.description?.trim(), status: input!.status ?? "DRAFT",
      startsAt: input!.startDate ? new Date(`${input!.startDate}T00:00:00.000Z`) : undefined, endsAt: input!.endDate ? new Date(`${input!.endDate}T23:59:59.999Z`) : undefined,
      timezone: String(input!.metadata?.timezone ?? "Asia/Kolkata"), layout: String(input!.media ?? "OORO Auto Screens"),
      campaignCenterLat: input!.campaignCenterLat, campaignCenterLng: input!.campaignCenterLng, radiusKm: input!.radiusKm,
      forecastSnapshot: input!.forecastSnapshot ? JSON.parse(JSON.stringify(input!.forecastSnapshot)) : undefined, forecastGeneratedAt: input!.forecastGeneratedAt ? new Date(input!.forecastGeneratedAt) : undefined, forecastExpiresAt: input!.forecastExpiresAt ? new Date(input!.forecastExpiresAt) : undefined, forecastVersion: input!.forecastVersion,
      deliveryTier: input!.deliveryTier ?? (String(input!.metadata?.deliveryTier ?? "STANDARD") === "PREMIUM_PLUS" ? "PREMIUM_PLUS" : "STANDARD"), pricingPlanId: requestedPlan?.id, effectiveRate: rate, pricingSource: requestedPlan ? (requestedPlan.customerType === "SELF_SERVE" ? "PUBLIC_SELF_SERVE" : "VERIFIED_PLAN") : undefined, pricingSnapshot: requestedPlan ? { customerType: requestedPlan.customerType, plan: requestedPlan.name, impressionRate: requestedPlan.impressionRate, autoDayRate: requestedPlan.autoDayRate, effectiveRate: rate, budget: input!.budget ?? null } : undefined,
      metadata,
    } });
    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch { return NextResponse.json({ error: { message: "Campaign could not be saved" } }, { status: 503 }); }
}

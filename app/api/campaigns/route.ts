import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";
import { validateCampaignDates } from "@/apps/api/src/domain/campaign-validation";

type CampaignInput = {
  name?: string; description?: string; goal?: string; audience?: string; city?: string; area?: string;
  startDate?: string; endDate?: string; media?: string; budget?: number; currency?: string;
  metadata?: Record<string, unknown>; status?: "DRAFT" | "SCHEDULED";
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
  return null;
}

export async function GET() {
  const email = await owner();
  if (!email) return NextResponse.json({ error: { message: "Sign in to view campaigns" } }, { status: 401 });
  try {
    const campaigns = await webPrisma.campaign.findMany({ where: { ownerEmail: email }, orderBy: { updatedAt: "desc" } });
    return NextResponse.json({ data: campaigns });
  } catch { return NextResponse.json({ error: { message: "Campaign service unavailable" } }, { status: 503 }); }
}

export async function POST(request: Request) {
  const email = await owner();
  if (!email) return NextResponse.json({ error: { message: "Sign in to save campaigns" } }, { status: 401 });
  const input = await request.json().catch(() => null) as CampaignInput | null;
  const error = validate(input ?? {}, input?.status === "DRAFT");
  if (error) return NextResponse.json({ error: { message: error } }, { status: 422 });
  try {
    const campaign = await webPrisma.campaign.create({ data: {
      ownerEmail: email, name: input!.name!.trim(), description: input!.description?.trim(), status: input!.status ?? "DRAFT",
      startsAt: input!.startDate ? new Date(`${input!.startDate}T00:00:00.000Z`) : undefined, endsAt: input!.endDate ? new Date(`${input!.endDate}T23:59:59.999Z`) : undefined,
      timezone: String(input!.metadata?.timezone ?? "Asia/Kolkata"), layout: String(input!.media ?? "OORO Auto Screens"),
      metadata: { goal: input!.goal, audience: input!.audience, city: input!.city, area: input!.area, media: input!.media, budget: input!.budget, currency: input!.currency, ...input!.metadata },
    } });
    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch { return NextResponse.json({ error: { message: "Campaign could not be saved" } }, { status: 503 }); }
}

import { NextResponse } from "next/server";
import { validateCampaignContinuation } from "@/apps/api/src/domain/campaign-transition";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to continue this campaign" } }, { status: 401 });
  const { id } = await params;

  try {
    const campaign = await webPrisma.campaign.findFirst({
      where: { id, ownerEmail },
      include: {
        creatives: { where: { status: "ACTIVE" }, include: { asset: true }, take: 1 },
        assignments: { where: { active: true }, select: { id: true } },
      },
    });
    if (!campaign) return NextResponse.json({ error: { message: "Campaign not found" } }, { status: 404 });

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
    const updated = campaign.status === "SCHEDULED" || campaign.status === "ACTIVE"
      ? { id: campaign.id, status: campaign.status, name: campaign.name, startsAt: campaign.startsAt, endsAt: campaign.endsAt }
      : await webPrisma.campaign.update({ where: { id: campaign.id }, data: { status: "SCHEDULED" } });
    return NextResponse.json({ data: { id: updated.id, status: updated.status, name: updated.name, startsAt: updated.startsAt, endsAt: updated.endsAt, transition: "CONTINUE_SETUP", deliveryQueued: true } });
  } catch {
    return NextResponse.json({ error: { message: "Campaign could not continue" } }, { status: 503 });
  }
}

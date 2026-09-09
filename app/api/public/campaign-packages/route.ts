import { NextResponse } from "next/server";
import { publicCampaignPackages } from "@/lib/public-campaign-packages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ data: publicCampaignPackages.filter((item) => item.active), error: null });
}

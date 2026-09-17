import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await webContext();
  if (!context) return NextResponse.json({ data: null }, { status: 401 });
  return NextResponse.json({ data: { email: context.email, name: context.account.name, accountType: context.account.accountType, onboardingStatus: context.account.onboardingStatus, onboardingStep: context.account.onboardingStep, organization: context.organization ? { id: context.organization.id, name: context.organization.name, type: context.organization.type, verificationStatus: context.organization.verificationStatus } : null } });
}

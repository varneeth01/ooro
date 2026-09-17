import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";

export async function POST(request: Request) {
  const context = await webContext(); if (!context) return NextResponse.json({ error: { message: "Sign in before continuing" } }, { status: 401 });
  if (context.account.accountType !== "EXPLORER") return NextResponse.json({ error: { message: "This onboarding flow is not available for this account" } }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; const city = String(body?.city ?? "").trim(); const interests = Array.isArray(body?.interests) ? body.interests.map(String).filter(Boolean) : [];
  if (city.length < 2 || !interests.length) return NextResponse.json({ error: { message: "Choose a city and at least one interest." } }, { status: 422 });
  await webPrisma.webAccount.update({ where: { id: context.account.id }, data: { onboardingStatus: "COMPLETED", onboardingStep: 2, onboardingCompletedAt: new Date(), onboardingData: { name: String(body?.name ?? context.account.name), city, interests } } });
  return NextResponse.json({ data: { next: "/" } });
}

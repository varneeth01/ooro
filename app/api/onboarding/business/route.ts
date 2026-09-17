import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";

export async function POST(request: Request) {
  const context = await webContext(); if (!context) return NextResponse.json({ error: { message: "Sign in before continuing" } }, { status: 401 });
  if (context.account.accountType !== "BUSINESS") return NextResponse.json({ error: { message: "This onboarding flow is not available for this account" } }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const businessName = String(body?.businessName ?? "").trim(); const category = String(body?.category ?? "").trim(); const city = String(body?.city ?? "").trim(); const address = String(body?.address ?? "").trim(); const goals = Array.isArray(body?.goals) ? body.goals.map(String).filter(Boolean) : [];
  const step = Number(body?.step);
  if (step === 1 || step === 2) { const previous = context.account.onboardingData && typeof context.account.onboardingData === "object" && !Array.isArray(context.account.onboardingData) ? context.account.onboardingData as Record<string, unknown> : {}; await webPrisma.webAccount.update({ where: { id: context.account.id }, data: { onboardingStatus: "IN_PROGRESS", onboardingStep: step, onboardingData: JSON.parse(JSON.stringify({ ...previous, ...body })) } }); return NextResponse.json({ data: { status: "IN_PROGRESS", step } }); }
  if (businessName.length < 2 || category.length < 2 || city.length < 2 || address.length < 2 || !goals.length) return NextResponse.json({ error: { message: "Complete your business, location and advertising goal details." } }, { status: 422 });
  await webPrisma.webAccount.update({ where: { id: context.account.id }, data: { name: businessName, onboardingStatus: "COMPLETED", onboardingStep: 4, onboardingCompletedAt: new Date(), onboardingData: { businessName, category, website: String(body?.website ?? "").trim(), social: String(body?.social ?? "").trim(), city, address, goals } } });
  return NextResponse.json({ data: { next: "/dashboard" } }, { status: 200 });
}

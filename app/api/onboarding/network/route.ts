import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";
import { normalizeIndianPhone } from "@/apps/api/src/domain/phone";

export async function POST(request: Request) {
  const context = await webContext(); if (!context) return NextResponse.json({ error: { message: "Sign in before continuing" } }, { status: 401 });
  if (context.account.accountType !== "NETWORK") return NextResponse.json({ error: { message: "This onboarding flow is not available for this account" } }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null; const phone = normalizeIndianPhone(String(body?.phone ?? ""));
  const role = String(body?.role ?? "").trim(); const vehicleType = String(body?.vehicleType ?? "").trim(); const registration = String(body?.registration ?? "").trim(); const city = String(body?.city ?? "").trim(); const operatingAreas = String(body?.operatingAreas ?? "").trim();
  if (!phone || !["DRIVER", "VEHICLE_OWNER", "FLEET_OPERATOR"].includes(role) || !vehicleType || !city || !operatingAreas || (role !== "FLEET_OPERATOR" && !registration)) return NextResponse.json({ error: { message: !phone ? "Enter a valid phone number." : "Complete your network application details." } }, { status: 422 });
  await webPrisma.webAccount.update({ where: { id: context.account.id }, data: { phone, onboardingStatus: "COMPLETED", onboardingStep: 5, onboardingCompletedAt: new Date(), onboardingData: { role, vehicleType, registration, city, operatingAreas, fleetSize: String(body?.fleetSize ?? ""), name: String(body?.name ?? context.account.name), whatsapp: String(body?.whatsapp ?? phone), operatingDays: String(body?.operatingDays ?? ""), operatingHours: String(body?.operatingHours ?? ""), screenInstallation: body?.screenInstallation === true } } });
  return NextResponse.json({ data: { next: "/network/status" } });
}

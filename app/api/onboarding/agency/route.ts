import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";
import { normalizeIndianPhone } from "@/apps/api/src/domain/phone";

export async function POST(request: Request) {
  const context = await webContext();
  if (!context) return NextResponse.json({ error: { message: "Sign in before applying" } }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const agencyName = String(body?.agencyName ?? "").trim();
  const website = String(body?.website ?? "").trim();
  const phone = normalizeIndianPhone(String(body?.phone ?? ""));
  if (agencyName.length < 2 || !website || !phone) return NextResponse.json({ error: { message: !phone ? "Enter a valid phone number." : "Agency name and website are required" } }, { status: 422 });
  const organization = await webPrisma.organization.create({ data: { name: agencyName, type: "AGENCY", website, domain: context.email.split("@")[1]?.toLowerCase(), verificationStatus: "PENDING_REVIEW", members: { create: { userId: context.account.id, role: "OWNER" } }, agencyProfile: { create: { applicationStatus: "APPLICATION_RECEIVED", salesStage: "NEW_LEAD", monthlySpendEstimate: Number(body?.monthlySpendEstimate) || undefined, clientCount: Number(body?.clientCount) || undefined, headquarters: String(body?.headquarters ?? "").trim() || undefined, teamSize: String(body?.teamSize ?? "").trim() || undefined, primaryMarkets: String(body?.primaryMarkets ?? "").trim() || undefined, clientCategories: String(body?.clientCategories ?? "").trim() || undefined, gstDetails: String(body?.gstDetails ?? "").trim() || undefined } } } });
  const verificationRequest = await webPrisma.verificationRequest.create({ data: { organizationId: organization.id, status: "PENDING_REVIEW", metadata: { applicantName: context.account.name, email: context.email, phone, agencyName, website } } });
  await webPrisma.verificationHistory.create({ data: { verificationRequestId: verificationRequest.id, fromStatus: "UNVERIFIED", toStatus: "PENDING_REVIEW", notes: "Agency application submitted" } });
  await webPrisma.webAccount.update({ where: { id: context.account.id }, data: { phone, onboardingStatus: "COMPLETED", onboardingStep: 4, onboardingCompletedAt: new Date(), onboardingData: { agencyName, website, headquarters: String(body?.headquarters ?? "").trim(), teamSize: String(body?.teamSize ?? "").trim(), clientCount: String(body?.clientCount ?? "").trim(), monthlySpendEstimate: String(body?.monthlySpendEstimate ?? "").trim(), primaryMarkets: String(body?.primaryMarkets ?? "").trim(), contactRole: String(body?.contactRole ?? "").trim() } } });
  return NextResponse.json({ data: { organizationId: organization.id, applicationStatus: "APPLICATION_RECEIVED" } }, { status: 201 });
}

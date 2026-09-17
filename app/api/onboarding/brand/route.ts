import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";
import { normalizeIndianPhone } from "@/apps/api/src/domain/phone";

const freeDomains = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "proton.me"]);

export async function POST(request: Request) {
  const context = await webContext();
  if (!context) return NextResponse.json({ error: { message: "Sign in before starting brand verification" } }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const companyName = String(body?.companyName ?? "").trim();
  const website = String(body?.website ?? "").trim();
  const role = String(body?.role ?? "").trim();
  const phone = normalizeIndianPhone(String(body?.phone ?? ""));
  const gstDetails = String(body?.gstDetails ?? "").trim();
  if (companyName.length < 2 || role.length < 2 || !phone || !website) return NextResponse.json({ error: { message: !phone ? "Enter a valid phone number." : "Company, role and website are required" } }, { status: 422 });
  const domain = context.email.split("@")[1]?.toLowerCase() ?? null;
  const verificationStatus = domain && freeDomains.has(domain) ? "PENDING_REVIEW" : "PENDING_REVIEW";
  const existingMembership = await webPrisma.organizationMember.findFirst({ where: { userId: context.account.id }, include: { organization: true } });
  const organization = existingMembership?.organization?.type === "BRAND"
    ? await webPrisma.organization.update({ where: { id: existingMembership.organization.id }, data: { name: companyName, website, domain, verificationStatus } })
    : await webPrisma.organization.create({ data: { name: companyName, type: "BRAND", website, domain, verificationStatus, members: { create: { userId: context.account.id, role: "OWNER" } } } });
  const requestRecord = await webPrisma.verificationRequest.create({ data: { organizationId: organization.id, status: "PENDING_REVIEW", metadata: { applicantName: context.account.name, email: context.email, role, phone, companyName, website, gstDetails, automaticDomainVerification: Boolean(domain && !freeDomains.has(domain)) } } });
  await webPrisma.verificationHistory.create({ data: { verificationRequestId: requestRecord.id, fromStatus: "UNVERIFIED", toStatus: "PENDING_REVIEW", notes: "Brand verification submitted" } });
  await webPrisma.webAccount.update({ where: { id: context.account.id }, data: { phone, onboardingStatus: "COMPLETED", onboardingStep: 4, onboardingCompletedAt: new Date(), onboardingData: { companyName, website, industry: String(body?.industry ?? "").trim(), workEmail: String(body?.workEmail ?? context.email).trim(), role, city: String(body?.city ?? "").trim(), address: String(body?.address ?? "").trim(), monthlyBudget: String(body?.monthlyBudget ?? "").trim(), objective: String(body?.objective ?? "").trim(), gstDetails } } });
  return NextResponse.json({ data: { organizationId: organization.id, verificationStatus: organization.verificationStatus, companyEmailVerification: Boolean(domain && !freeDomains.has(domain)) } }, { status: 201 });
}

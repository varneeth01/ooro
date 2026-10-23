import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { WEB_SESSION_COOKIE } from "@/lib/auth/session";
import { webContext } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";

export const dynamic = "force-dynamic";
const LIFETIME_SECONDS = 30 * 24 * 60 * 60;
const RENEW_THRESHOLD_SECONDS = 15 * 24 * 60 * 60;

export async function GET() {
  const context = await webContext();
  if (!context) return NextResponse.json({ data: null }, { status: 401, headers: { "cache-control": "no-store" } });
  const response = NextResponse.json({ data: { email: context.email, name: context.account.name, accountType: context.account.accountType, onboardingStatus: context.account.onboardingStatus, onboardingStep: context.account.onboardingStep, organization: context.organization ? { id: context.organization.id, name: context.organization.name, type: context.organization.type, verificationStatus: context.organization.verificationStatus } : null } }, { headers: { "cache-control": "no-store" } });
  // Renew only an already-valid server session. Deleted sessions stay logged out.
  const token = (await cookies()).get(WEB_SESSION_COOKIE)?.value;
  if (token) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LIFETIME_SECONDS * 1000);
    const renewed = await webPrisma.webSession.updateMany({
      where: { tokenHash, ownerEmail: context.email, expiresAt: { gt: now, lt: new Date(now.getTime() + RENEW_THRESHOLD_SECONDS * 1000) } },
      data: { expiresAt },
    });
    if (renewed.count) response.cookies.set(WEB_SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: LIFETIME_SECONDS });
  }
  return response;
}

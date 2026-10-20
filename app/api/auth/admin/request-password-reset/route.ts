import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backend-url";

export async function POST(request: Request) {
  const base = backendApiUrl();
  if (!base) return NextResponse.json({ error: { message: "If the account exists, password reset instructions will be sent." } }, { status: 202 });
  await fetch(`${base}/api/auth/admin/request-password-reset`, { method: "POST", headers: { "content-type": "application/json" }, body: await request.text(), cache: "no-store" }).catch(() => null);
  return NextResponse.json({ data: { message: "If the account exists, password reset instructions will be sent." } }, { status: 202 });
}

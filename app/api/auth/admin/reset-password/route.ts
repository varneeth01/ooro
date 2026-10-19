import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backend-url";

export async function POST(request: Request) {
  const base = backendApiUrl();
  if (!base) return NextResponse.json({ error: { message: "Password reset is temporarily unavailable." } }, { status: 502 });
  const response = await fetch(`${base}/api/auth/admin/reset-password`, { method: "POST", headers: { "content-type": "application/json" }, body: await request.text(), cache: "no-store" }).catch(() => null);
  const payload = response ? await response.json().catch(() => ({ error: { message: "Password reset is temporarily unavailable." } })) : { error: { message: "Password reset is temporarily unavailable." } };
  return NextResponse.json(payload, { status: response?.status ?? 502 });
}

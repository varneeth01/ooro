import { NextResponse } from "next/server";
import { saveBackendSession } from "@/lib/auth/backend-session";
import { backendApiUrl } from "@/lib/backend-url";

export async function POST(request: Request) {
  const base = backendApiUrl();
  if (!base) return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "We couldn't sign you in right now. Please try again." } }, { status: 502 });
  const response = await fetch(`${base}/api/auth/admin/login`, { method: "POST", headers: { "content-type": "application/json" }, body: await request.text(), cache: "no-store" }).catch(() => null);
  if (!response) return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "We couldn't sign you in right now. Please try again." } }, { status: 502 });
  const payload = await response.json().catch(() => ({ error: { message: "We couldn't sign you in right now. Please try again." } }));
  if (!response.ok) return NextResponse.json({ error: { code: payload.error?.code, message: response.status === 429 ? "Too many sign-in attempts. Please try again later." : response.status >= 500 ? "We couldn't sign you in right now. Please try again." : "Invalid email or password." } }, { status: response.status });
  const data = payload.data;
  if (!data?.accessToken || !data.refreshToken || !data.user) return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "We couldn't sign you in right now. Please try again." } }, { status: 502 });
  await saveBackendSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return NextResponse.json({ data: { user: data.user } }, { status: 200 });
}

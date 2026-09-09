import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/api-url";
import { saveBackendSession } from "@/lib/auth/backend-session";

export async function POST(request: Request) {
  const backendUrl = apiUrl || process.env.OORO_BACKEND_API_URL?.trim().replace(/\/$/, "") || (process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || null : "http://127.0.0.1:8080");
  if (!backendUrl) return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "Admin backend is not configured" } }, { status: 502 });
  const response = await fetch(`${backendUrl}/api/auth/admin/verify-otp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(await request.json()), cache: "no-store" }).catch(() => null);
  if (!response) return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "Admin backend is unavailable" } }, { status: 502 });
  const payload = await response.json().catch(() => ({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "Admin backend returned an invalid response" } }));
  if (!response.ok) return NextResponse.json(payload, { status: response.status });
  const data = (payload as { data?: { accessToken?: string; refreshToken?: string; user?: { id: string; role: string; name?: string } } }).data;
  if (!data?.accessToken || !data.refreshToken || !data.user) return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "Admin backend returned an incomplete session" } }, { status: 502 });
  await saveBackendSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return NextResponse.json({ ok: true, user: data.user });
}

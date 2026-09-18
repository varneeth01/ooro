import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backend-url";

export async function POST(request: Request) {
  const backendUrl = backendApiUrl();
  if (!backendUrl) return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "Admin backend is not configured" } }, { status: 502 });
  const response = await fetch(`${backendUrl}/api/auth/admin/request-otp`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(await request.json()), cache: "no-store" }).catch(() => null);
  if (!response) return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "Admin backend is unavailable" } }, { status: 502 });
  const payload = await response.json().catch(() => ({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "Admin backend returned an invalid response" } }));
  if (response.status >= 500) return NextResponse.json({ error: { code: "ADMIN_BACKEND_UNAVAILABLE", message: "We couldn't sign you in right now. Please try again." } }, { status: response.status >= 503 ? 503 : 502 });
  return NextResponse.json(payload, { status: response.status });
}

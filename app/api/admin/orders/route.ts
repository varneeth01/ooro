import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { apiUrl } from "@/lib/api-url";

async function authorized() { const session = (await cookies()).get(SESSION_COOKIE)?.value ?? ""; return session.startsWith("admin@ooro.test.") && Boolean(process.env.OORO_ADMIN_API_TOKEN); }
export async function GET(request: Request) { if (!(await authorized())) return NextResponse.json({ error: "Admin API is not configured or access is denied" }, { status: 403 }); const url = new URL(request.url); const response = await fetch(`${apiUrl}/api/admin/orders${url.search}`, { headers: { authorization: `Bearer ${process.env.OORO_ADMIN_API_TOKEN}` }, cache: "no-store" }); const payload = await response.json().catch(() => ({ error: "Backend returned invalid JSON" })); return NextResponse.json(payload, { status: response.status }); }

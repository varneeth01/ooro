import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.phone || !body?.city || !body?.userType) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  const payload = { name: String(body.name).trim(), email: String(body.email).trim().toLowerCase(), phone: String(body.phone).trim(), city: String(body.city).trim(), userType: String(body.userType), company: String(body.company || "").trim(), status: "new", createdAt: body.createdAt || new Date().toISOString(), source: body.source || "direct" };
  // Deployment adapter: connect WAITLIST_WEBHOOK_URL to a database/CRM when ready.
  if (process.env.WAITLIST_WEBHOOK_URL) { const response = await fetch(process.env.WAITLIST_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); if (!response.ok) return NextResponse.json({ error: "Persistence service unavailable" }, { status: 502 }); }
  return NextResponse.json({ ok: true });
}

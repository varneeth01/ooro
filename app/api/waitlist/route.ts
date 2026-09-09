import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.name || !body?.email || !body?.phone || !body?.city || !body?.userType) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  const payload = { name: String(body.name).trim(), email: String(body.email).trim().toLowerCase(), phone: String(body.phone).trim(), city: String(body.city).trim(), userType: String(body.userType).trim(), company: String(body.company || "").trim(), status: "NEW", source: String(body.source || "direct") };
  try {
    const submission = await webPrisma.waitlistSubmission.create({ data: payload });
    if (process.env.WAITLIST_WEBHOOK_URL) {
      const response = await fetch(process.env.WAITLIST_WEBHOOK_URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, id: submission.id, createdAt: submission.createdAt }) });
      if (!response.ok) return NextResponse.json({ error: "Saved, but notification delivery failed" }, { status: 202 });
    }
    return NextResponse.json({ ok: true, id: submission.id }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This email is already on the waitlist for this city." }, { status: 409 });
    return NextResponse.json({ error: "We couldn’t save that just yet. Please try again." }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

export async function GET() {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view quote requests" } }, { status: 401 });
  try { return NextResponse.json({ data: await webPrisma.quoteRequest.findMany({ where: { ownerEmail }, orderBy: { createdAt: "desc" } }) }); }
  catch { return NextResponse.json({ error: { message: "Quote service unavailable" } }, { status: 503 }); }
}

export async function POST(request: Request) {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to request a quote" } }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = String(body?.title ?? "").trim();
  const details = String(body?.details ?? "").trim();
  if (!title || !details) return NextResponse.json({ error: { message: "Add a request title and campaign details" } }, { status: 422 });
  try {
    const quote = await webPrisma.quoteRequest.create({ data: { ownerEmail, title, details } });
    return NextResponse.json({ data: quote }, { status: 201 });
  } catch { return NextResponse.json({ error: { message: "Quote request could not be saved" } }, { status: 503 }); }
}

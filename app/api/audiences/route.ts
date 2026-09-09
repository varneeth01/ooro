import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

export async function GET() {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view audiences" } }, { status: 401 });
  try { return NextResponse.json({ data: await webPrisma.savedAudience.findMany({ where: { ownerEmail }, orderBy: { updatedAt: "desc" } }) }); }
  catch { return NextResponse.json({ error: { message: "Audience service unavailable" } }, { status: 503 }); }
}

export async function POST(request: Request) {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to save audiences" } }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = String(body?.name ?? "").trim();
  const description = String(body?.description ?? "").trim();
  if (!name || !description) return NextResponse.json({ error: { message: "Audience name and description are required" } }, { status: 422 });
  try {
    const audience = await webPrisma.savedAudience.create({ data: { ownerEmail, name, description, locations: String(body?.locations ?? "").trim(), ageRange: String(body?.ageRange ?? "").trim(), interests: String(body?.interests ?? "").trim() } });
    return NextResponse.json({ data: audience }, { status: 201 });
  } catch { return NextResponse.json({ error: { message: "Audience could not be saved" } }, { status: 503 }); }
}

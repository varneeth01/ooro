import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

export async function GET() {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view brands" } }, { status: 401 });
  try { return NextResponse.json({ data: await webPrisma.workspaceBrand.findMany({ where: { ownerEmail }, orderBy: { updatedAt: "desc" } }) }); }
  catch { return NextResponse.json({ error: { message: "Brand service unavailable" } }, { status: 503 }); }
}

export async function POST(request: Request) {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to save brands" } }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: { message: "Brand name is required" } }, { status: 422 });
  try {
    const brand = await webPrisma.workspaceBrand.create({ data: { ownerEmail, name, website: String(body?.website ?? "").trim(), industry: String(body?.industry ?? "").trim(), market: String(body?.market ?? "").trim(), description: String(body?.description ?? "").trim() || undefined } });
    return NextResponse.json({ data: brand }, { status: 201 });
  } catch { return NextResponse.json({ error: { message: "Brand could not be saved" } }, { status: 503 }); }
}

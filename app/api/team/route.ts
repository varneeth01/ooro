import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

export async function GET() {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view team" } }, { status: 401 });
  try { return NextResponse.json({ data: await webPrisma.teamInvite.findMany({ where: { ownerEmail }, orderBy: { createdAt: "desc" } }) }); }
  catch { return NextResponse.json({ error: { message: "Team service unavailable" } }, { status: 503 }); }
}

export async function POST(request: Request) {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to invite teammates" } }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const inviteEmail = String(body?.inviteEmail ?? "").trim().toLowerCase();
  const role = String(body?.role ?? "MEMBER").trim().toUpperCase();
  if (!/^\S+@\S+\.\S+$/.test(inviteEmail)) return NextResponse.json({ error: { message: "Enter a valid invite email" } }, { status: 422 });
  if (!["MEMBER", "ADMIN"].includes(role)) return NextResponse.json({ error: { message: "Invalid team role" } }, { status: 422 });
  try {
    const invite = await webPrisma.teamInvite.create({ data: { ownerEmail, inviteEmail, role } });
    return NextResponse.json({ data: invite }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: { message: "That teammate already has an invite" } }, { status: 409 });
    return NextResponse.json({ error: { message: "Invite could not be saved" } }, { status: 503 });
  }
}

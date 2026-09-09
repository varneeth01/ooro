import { NextResponse } from "next/server";
import { webPrisma } from "@/lib/web-prisma";
import { webOwnerEmail } from "@/lib/web-owner";

export async function GET() {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to view settings" } }, { status: 401 });
  try {
    const settings = await webPrisma.workspaceSettings.findUnique({ where: { ownerEmail } });
    return NextResponse.json({ data: settings ?? { workspaceName: "OORO Workspace", workspaceType: "Brand / Company" } });
  } catch { return NextResponse.json({ error: { message: "Settings service unavailable" } }, { status: 503 }); }
}

export async function PUT(request: Request) {
  const ownerEmail = await webOwnerEmail();
  if (!ownerEmail) return NextResponse.json({ error: { message: "Sign in to save settings" } }, { status: 401 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const workspaceName = String(body?.workspaceName ?? "").trim();
  const workspaceType = String(body?.workspaceType ?? "").trim();
  if (!workspaceName || !workspaceType) return NextResponse.json({ error: { message: "Workspace name and type are required" } }, { status: 422 });
  try {
    const settings = await webPrisma.workspaceSettings.upsert({ where: { ownerEmail }, create: { ownerEmail, workspaceName, workspaceType }, update: { workspaceName, workspaceType } });
    return NextResponse.json({ data: settings });
  } catch { return NextResponse.json({ error: { message: "Settings could not be saved" } }, { status: 503 }); }
}

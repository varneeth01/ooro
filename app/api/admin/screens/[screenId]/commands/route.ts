import { NextResponse } from "next/server";
import { AdminAuthError, getAuthenticatedAdmin, proxyAdminRequest } from "@/lib/auth/backend-session";
import { webPrisma } from "@/lib/web-prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ screenId: string }> }) {
  try { await getAuthenticatedAdmin(); const { screenId } = await params; const commands = await webPrisma.displayCommand.findMany({ where: { displayId: screenId }, orderBy: { createdAt: "desc" }, take: 10 }); return NextResponse.json({ data: JSON.parse(JSON.stringify(commands, (_key, value) => typeof value === "bigint" ? Number(value) : value)) }); }
  catch (error) { const status = error instanceof AdminAuthError ? error.status : 502; return NextResponse.json({ error: { message: error instanceof AdminAuthError ? "Admin authorization is required" : "Admin backend is unavailable" } }, { status }); }
}

export async function POST(request: Request, { params }: { params: Promise<{ screenId: string }> }) {
  try {
    const { screenId } = await params;
    const response = await proxyAdminRequest(`/api/admin/displays/${screenId}/commands`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(await request.json()) });
    const payload = await response.json().catch(() => ({ error: { message: "Backend returned invalid JSON" } }));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const status = error instanceof AdminAuthError ? error.status : 502;
    return NextResponse.json({ error: { message: error instanceof AdminAuthError ? "Admin authorization is required" : "Admin backend is unavailable" } }, { status });
  }
}

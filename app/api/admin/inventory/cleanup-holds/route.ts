import { NextResponse } from "next/server";
import { AdminAuthError, requireAdminPermission } from "@/lib/auth/backend-session";
import { webPrisma } from "@/lib/web-prisma";
export async function POST() { try { await requireAdminPermission("operations:write"); const result = await webPrisma.inventoryAllocation.updateMany({ where: { status: "HELD", expiresAt: { lt: new Date() } }, data: { status: "CANCELLED", expiresAt: null } }); console.info("INVENTORY_HOLD_EXPIRED", result.count); return NextResponse.json({ data: { released: result.count } }); } catch (e) { const status = e instanceof AdminAuthError ? e.status : 500; return NextResponse.json({ error: { message: status === 500 ? "Hold cleanup failed" : "Admin access required" } }, { status }); } }

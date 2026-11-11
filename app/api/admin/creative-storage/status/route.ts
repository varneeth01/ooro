import { NextResponse } from "next/server";
import { requireAdminPermission, AdminAuthError } from "@/lib/auth/backend-session";
import { creativeStorageReadiness } from "@/lib/creative-storage";

export const dynamic = "force-dynamic";
export async function GET() {
 try {
  await requireAdminPermission("creative:write");
  const status = creativeStorageReadiness();
  return NextResponse.json({ data: status }, { headers: { "cache-control": "no-store" } });
 } catch (error) {
  return NextResponse.json({ error: { message: "Admin access required" } }, { status: error instanceof AdminAuthError ? error.status : 503 });
 }
}

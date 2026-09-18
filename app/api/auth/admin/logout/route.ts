import { NextResponse } from "next/server";
import { clearBackendSession } from "@/lib/auth/backend-session";

export async function POST() {
  await clearBackendSession();
  return NextResponse.json({ ok: true });
}

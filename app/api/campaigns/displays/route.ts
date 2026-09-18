import { NextResponse } from "next/server";
import { webOwnerEmail } from "@/lib/web-owner";

export async function GET() {
  if (!(await webOwnerEmail())) return NextResponse.json({ error: { message: "Sign in to plan a campaign" } }, { status: 401 });
  return NextResponse.json({ error: { code: "INTERNAL_ONLY", message: "Media allocation is managed by OORO." } }, { status: 403 });
}

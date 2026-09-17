import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";
import { adBalance } from "@/lib/ad-balance";
export async function GET() {
  const context = await webContext();
  if (!context) return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "Sign in required" } }, { status: 401 });
  const result = await adBalance(context.account.id);
  return NextResponse.json({ data: { availableBalancePaise: result.account.cachedBalancePaise.toString(), currency: result.account.currency, entries: result.entries.map(entry => ({ ...entry, amountPaise: entry.amountPaise.toString() })) } });
}

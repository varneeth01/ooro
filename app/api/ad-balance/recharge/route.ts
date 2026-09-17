import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";
import { createPublicRazorpayOrder, publicRazorpayErrorCode, publicRazorpayKeyId } from "@/lib/public-razorpay";
import { webPrisma } from "@/lib/web-prisma";
export async function POST(request: Request) {
  const context = await webContext();
  if (!context) return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "Sign in required" } }, { status: 401 });
  if (context.account.accountType !== "BUSINESS") return NextResponse.json({ error: { code: "BUSINESS_ACCOUNT_REQUIRED", message: "Ad Balance recharge is available to Business accounts." } }, { status: 403 });
  const body = await request.json().catch(() => null) as { amountRupees?: number } | null;
  const amount = Math.round(Number(body?.amountRupees));
  if (!Number.isInteger(amount) || amount < 500 || amount > 500000) return NextResponse.json({ error: { code: "INVALID_RECHARGE_AMOUNT", message: "Enter an amount between ₹500 and ₹5,00,000." } }, { status: 422 });
  try {
    const order = await createPublicRazorpayOrder(`adbal_${context.account.id}_${Date.now()}`, amount, { purpose: "OORO_AD_BALANCE_RECHARGE", accountId: context.account.id });
    await webPrisma.adBalanceRechargeOrder.create({ data: { accountId: context.account.id, razorpayOrderId: order.id, amountPaise: BigInt(amount * 100) } });
    return NextResponse.json({ data: { orderId: order.id, razorpayOrderId: order.id, keyId: publicRazorpayKeyId(), amount: order.amount, currency: order.currency, amountRupees: amount } });
  } catch (error) { return NextResponse.json({ error: { code: publicRazorpayErrorCode(error), message: "Ad Balance recharge is temporarily unavailable." } }, { status: 503 }); }
}

import { NextResponse } from "next/server";
import { webContext } from "@/lib/web-owner";
import { webPrisma } from "@/lib/web-prisma";
import { verifyPublicCheckoutSignature } from "@/lib/public-razorpay";
export async function POST(request: Request) {
  const context = await webContext();
  if (!context) return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "Sign in required" } }, { status: 401 });
  const body = await request.json().catch(() => null) as { razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string; amountRupees?: number } | null;
  if (!body?.razorpayOrderId || !body.razorpayPaymentId || !verifyPublicCheckoutSignature(body.razorpayOrderId, body.razorpayPaymentId, body.razorpaySignature ?? "")) return NextResponse.json({ error: { code: "INVALID_PAYMENT_SIGNATURE", message: "Payment could not be verified." } }, { status: 400 });
  const order = await webPrisma.adBalanceRechargeOrder.findUnique({ where: { razorpayOrderId: body.razorpayOrderId } });
  if (!order || order.accountId !== context.account.id || order.status === "FAILED") return NextResponse.json({ error: { code: "PAYMENT_ORDER_NOT_FOUND", message: "Recharge order not found." } }, { status: 404 });
  const account = await webPrisma.adBalanceAccount.upsert({ where: { accountId: context.account.id }, update: {}, create: { accountId: context.account.id } });
  const result = await webPrisma.$transaction(async tx => {
    const existing = await tx.adBalanceLedgerEntry.findUnique({ where: { idempotencyKey: `razorpay:${body.razorpayPaymentId}` } });
    if (existing) return tx.adBalanceAccount.findUniqueOrThrow({ where: { id: account.id } });
    const amountPaise = order.amountPaise;
    await tx.adBalanceLedgerEntry.create({ data: { accountId: account.id, type: "RECHARGE_CREDIT", amountPaise, razorpayOrderId: body.razorpayOrderId, razorpayPaymentId: body.razorpayPaymentId, idempotencyKey: `razorpay:${body.razorpayPaymentId}`, metadata: { purpose: "OORO_AD_BALANCE_RECHARGE" } } });
    await tx.adBalanceRechargeOrder.update({ where: { id: order.id }, data: { status: "PAID", razorpayPaymentId: body.razorpayPaymentId } });
    return tx.adBalanceAccount.update({ where: { id: account.id }, data: { cachedBalancePaise: { increment: amountPaise } } });
  });
  return NextResponse.json({ data: { availableBalancePaise: result.cachedBalancePaise.toString(), credited: true } });
}

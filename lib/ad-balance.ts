import { webPrisma } from "@/lib/web-prisma";

export async function adBalance(accountId: string) {
  const account = await webPrisma.adBalanceAccount.upsert({ where: { accountId }, update: {}, create: { accountId } });
  const entries = await webPrisma.adBalanceLedgerEntry.findMany({ where: { accountId: account.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const recharges = await webPrisma.adBalanceRechargeOrder.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 20 });
  return { account, entries, recharges };
}

export async function debitAdBalance(tx: typeof webPrisma, accountId: string, campaignId: string, budgetRupees: number) {
  const amountPaise = BigInt(Math.round(budgetRupees * 100));
  const account = await tx.adBalanceAccount.upsert({ where: { accountId }, update: {}, create: { accountId } });
  const updated = await tx.adBalanceAccount.updateMany({ where: { id: account.id, cachedBalancePaise: { gte: amountPaise } }, data: { cachedBalancePaise: { decrement: amountPaise } } });
  if (updated.count !== 1) return false;
  await tx.adBalanceLedgerEntry.create({ data: { accountId: account.id, type: "CAMPAIGN_DEBIT", amountPaise: -amountPaise, campaignId, idempotencyKey: `campaign-debit:${campaignId}` } });
  return true;
}

export async function creditRechargeByRazorpayOrder(orderId: string, paymentId: string) {
  return webPrisma.$transaction(async tx => {
    const order = await tx.adBalanceRechargeOrder.findUnique({ where: { razorpayOrderId: orderId } });
    if (!order || order.status === "PAID") return false;
    const account = await tx.adBalanceAccount.upsert({ where: { accountId: order.accountId }, update: {}, create: { accountId: order.accountId } });
    await tx.adBalanceLedgerEntry.create({ data: { accountId: account.id, type: "RECHARGE_CREDIT", amountPaise: order.amountPaise, razorpayOrderId: orderId, razorpayPaymentId: paymentId, idempotencyKey: `razorpay:${paymentId}`, metadata: { purpose: "OORO_AD_BALANCE_RECHARGE", source: "WEBHOOK" } } });
    await tx.adBalanceAccount.update({ where: { id: account.id }, data: { cachedBalancePaise: { increment: order.amountPaise } } });
    await tx.adBalanceRechargeOrder.update({ where: { id: order.id }, data: { status: "PAID", razorpayPaymentId: paymentId } });
    return true;
  });
}

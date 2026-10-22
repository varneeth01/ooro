import { webPrisma } from "@/lib/web-prisma";
// Historical balance and ledger reads only. New credits are not created.
export async function adBalance(accountId: string) {
  const account = await webPrisma.adBalanceAccount.upsert({ where: { accountId }, update: {}, create: { accountId } });
  const entries = await webPrisma.adBalanceLedgerEntry.findMany({ where: { accountId: account.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const recharges = await webPrisma.adBalanceRechargeOrder.findMany({ where: { accountId }, orderBy: { createdAt: "desc" }, take: 20 });
  return { account, entries, recharges };
}

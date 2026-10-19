import { Prisma } from "@prisma/client";

/** Reclaim an inactive ledger slot without weakening the unique screen/day/slot key. */
export async function writeInventoryAllocation(tx: Prisma.TransactionClient, data: Prisma.InventoryAllocationUncheckedCreateInput) {
 const {screenId,date,slot}=data;
 const reclaimed=await tx.inventoryAllocation.updateMany({where:{screenId,date,slot,status:"CANCELLED"},data:{...data,updatedAt:new Date()}});
 if(reclaimed.count) return;
 await tx.inventoryAllocation.create({data});
}

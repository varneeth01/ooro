DROP INDEX IF EXISTS "InventoryAllocation_holdId_key";
CREATE INDEX "InventoryAllocation_holdId_status_idx" ON "InventoryAllocation"("holdId", "status");

ALTER TABLE "Campaign" ADD COLUMN "forecastExpiresAt" TIMESTAMP(3);
ALTER TABLE "InventoryAllocation" ADD COLUMN "holdId" TEXT;
ALTER TABLE "InventoryAllocation" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "InventoryAllocation_holdId_key" ON "InventoryAllocation"("holdId");
ALTER TABLE "ForecastSetting" ADD COLUMN "forecastTtlMinutes" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "ForecastSetting" ADD COLUMN "inventoryHoldMinutes" INTEGER NOT NULL DEFAULT 15;

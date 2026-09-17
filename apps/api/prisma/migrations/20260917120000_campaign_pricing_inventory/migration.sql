ALTER TABLE "Campaign"
  ADD COLUMN "agencyOrganizationId" UUID,
  ADD COLUMN "agencyClientId" UUID,
  ADD COLUMN "pricingPlanId" UUID,
  ADD COLUMN "pricingSource" TEXT,
  ADD COLUMN "effectiveRate" INTEGER,
  ADD COLUMN "pricingSnapshot" JSONB,
  ADD COLUMN "deliveryTier" TEXT NOT NULL DEFAULT 'STANDARD';
CREATE INDEX "Campaign_agencyOrganizationId_agencyClientId_updatedAt_idx" ON "Campaign"("agencyOrganizationId", "agencyClientId", "updatedAt");

ALTER TABLE "AgencyClient"
  ADD COLUMN "industry" TEXT,
  ADD COLUMN "contactName" TEXT,
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "website" TEXT,
  ADD COLUMN "notes" TEXT;

CREATE TABLE "ScreenInventoryConfig" (
  "id" UUID NOT NULL,
  "screenId" UUID NOT NULL,
  "totalSlots" INTEGER NOT NULL DEFAULT 28,
  "commercialSlots" INTEGER NOT NULL DEFAULT 28,
  "premiumSlots" INTEGER NOT NULL DEFAULT 0,
  "houseSlots" INTEGER NOT NULL DEFAULT 0,
  "blockedSlots" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScreenInventoryConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ScreenInventoryConfig_screenId_key" ON "ScreenInventoryConfig"("screenId");
CREATE INDEX "ScreenInventoryConfig_commercialSlots_premiumSlots_idx" ON "ScreenInventoryConfig"("commercialSlots", "premiumSlots");
ALTER TABLE "ScreenInventoryConfig" ADD CONSTRAINT "ScreenInventoryConfig_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Display"("id") ON DELETE CASCADE ON UPDATE CASCADE;

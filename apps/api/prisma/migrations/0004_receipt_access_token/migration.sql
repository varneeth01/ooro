ALTER TABLE "GuestCampaignOrder" ADD COLUMN IF NOT EXISTS "receiptAccessTokenHash" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "GuestCampaignOrder_receiptAccessTokenHash_key" ON "GuestCampaignOrder"("receiptAccessTokenHash");

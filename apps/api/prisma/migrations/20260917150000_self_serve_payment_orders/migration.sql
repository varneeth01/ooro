ALTER TABLE "GuestCampaignOrder" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "GuestCampaignOrder" ADD COLUMN "holdId" TEXT;
ALTER TABLE "GuestCampaignOrder" ADD COLUMN "paymentProcessedAt" TIMESTAMP(3);
ALTER TABLE "GuestCampaignOrder" ADD COLUMN "failureReason" TEXT;
CREATE INDEX "GuestCampaignOrder_campaignId_ownerEmail_status_idx" ON "GuestCampaignOrder"("campaignId", "ownerEmail", "status");

ALTER TABLE "GuestCampaignOrder" ADD COLUMN "resolutionStatus" TEXT NOT NULL DEFAULT 'OPEN';
ALTER TABLE "GuestCampaignOrder" ADD COLUMN "resolutionNote" TEXT;
ALTER TABLE "GuestCampaignOrder" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "GuestCampaignOrder" ADD COLUMN "resolvedBy" TEXT;
ALTER TABLE "GuestCampaignOrder" ADD COLUMN "refundReference" TEXT;
ALTER TABLE "GuestCampaignOrder" ADD COLUMN "refundAmount" INTEGER;
ALTER TABLE "GuestCampaignOrder" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "GuestCampaignOrder" ADD COLUMN "refundedBy" TEXT;
CREATE INDEX "GuestCampaignOrder_resolutionStatus_createdAt_idx" ON "GuestCampaignOrder"("resolutionStatus", "createdAt");

CREATE TABLE "SelfServePaymentEvent" (
  "id" UUID NOT NULL,
  "orderId" TEXT NOT NULL,
  "campaignId" TEXT,
  "eventType" TEXT NOT NULL,
  "actor" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SelfServePaymentEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SelfServePaymentEvent_orderId_createdAt_idx" ON "SelfServePaymentEvent"("orderId", "createdAt");
CREATE INDEX "SelfServePaymentEvent_eventType_createdAt_idx" ON "SelfServePaymentEvent"("eventType", "createdAt");

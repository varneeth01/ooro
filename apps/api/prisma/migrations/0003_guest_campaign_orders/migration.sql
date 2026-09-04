CREATE TABLE "GuestCampaignOrder" (
  "id" UUID NOT NULL,
  "publicOrderNumber" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "gstin" TEXT,
  "campaignNotes" TEXT,
  "websiteOrInstagram" TEXT,
  "packageId" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "autos" INTEGER NOT NULL,
  "hoursPerDay" INTEGER NOT NULL,
  "campaignDurationDays" INTEGER NOT NULL,
  "subtotal" INTEGER NOT NULL,
  "tax" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "razorpayOrderId" TEXT,
  "razorpayPaymentId" TEXT,
  "paymentCapturedAt" TIMESTAMP(3),
  "campaignId" UUID,
  "receiptNumber" TEXT,
  "receiptAccessTokenHash" TEXT,
  "emailDeliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "emailLastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestCampaignOrder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RazorpayWebhookEvent" (
  "id" UUID NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RazorpayWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GuestCampaignOrder_publicOrderNumber_key" ON "GuestCampaignOrder"("publicOrderNumber");
CREATE UNIQUE INDEX "GuestCampaignOrder_razorpayOrderId_key" ON "GuestCampaignOrder"("razorpayOrderId");
CREATE UNIQUE INDEX "GuestCampaignOrder_receiptNumber_key" ON "GuestCampaignOrder"("receiptNumber");
CREATE UNIQUE INDEX "GuestCampaignOrder_receiptAccessTokenHash_key" ON "GuestCampaignOrder"("receiptAccessTokenHash");
CREATE INDEX "GuestCampaignOrder_status_createdAt_idx" ON "GuestCampaignOrder"("status", "createdAt");
CREATE INDEX "GuestCampaignOrder_customerEmail_idx" ON "GuestCampaignOrder"("customerEmail");
CREATE UNIQUE INDEX "RazorpayWebhookEvent_eventId_key" ON "RazorpayWebhookEvent"("eventId");

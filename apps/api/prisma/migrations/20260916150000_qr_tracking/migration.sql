CREATE TABLE "CampaignTrackingLink" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "campaignId" UUID NOT NULL,
    "creativeId" UUID NOT NULL,
    "displayId" UUID,
    "destinationUrl" TEXT NOT NULL,
    "ctaType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "CampaignTrackingLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QrScan" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "trackingLinkId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "creativeId" UUID NOT NULL,
    "displayId" UUID,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QrScan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignTrackingLink_token_key" ON "CampaignTrackingLink"("token");
CREATE INDEX "CampaignTrackingLink_campaignId_creativeId_displayId_idx" ON "CampaignTrackingLink"("campaignId", "creativeId", "displayId");
CREATE INDEX "CampaignTrackingLink_active_expiresAt_idx" ON "CampaignTrackingLink"("active", "expiresAt");
CREATE UNIQUE INDEX "QrScan_eventId_key" ON "QrScan"("eventId");
CREATE INDEX "QrScan_campaignId_occurredAt_idx" ON "QrScan"("campaignId", "occurredAt");
CREATE INDEX "QrScan_trackingLinkId_occurredAt_idx" ON "QrScan"("trackingLinkId", "occurredAt");

ALTER TABLE "CampaignTrackingLink" ADD CONSTRAINT "CampaignTrackingLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignTrackingLink" ADD CONSTRAINT "CampaignTrackingLink_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignTrackingLink" ADD CONSTRAINT "CampaignTrackingLink_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "QrScan" ADD CONSTRAINT "QrScan_trackingLinkId_fkey" FOREIGN KEY ("trackingLinkId") REFERENCES "CampaignTrackingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

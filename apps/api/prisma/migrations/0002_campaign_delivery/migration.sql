CREATE TABLE "Campaign" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  "layout" TEXT NOT NULL DEFAULT 'FULLSCREEN_AD',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Creative" (
  "id" UUID NOT NULL,
  "campaignId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "durationSeconds" INTEGER NOT NULL DEFAULT 10,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Creative_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Asset" (
  "id" UUID NOT NULL,
  "creativeId" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "checksum" TEXT,
  "mimeType" TEXT,
  "sizeBytes" BIGINT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DisplayCampaignAssignment" (
  "id" UUID NOT NULL,
  "displayId" UUID NOT NULL,
  "campaignId" UUID NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayCampaignAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Asset_creativeId_key" ON "Asset"("creativeId");
CREATE UNIQUE INDEX "DisplayCampaignAssignment_displayId_campaignId_key" ON "DisplayCampaignAssignment"("displayId", "campaignId");
CREATE INDEX "Campaign_status_startsAt_endsAt_idx" ON "Campaign"("status", "startsAt", "endsAt");
CREATE INDEX "Creative_campaignId_status_idx" ON "Creative"("campaignId", "status");
CREATE INDEX "DisplayCampaignAssignment_displayId_active_idx" ON "DisplayCampaignAssignment"("displayId", "active");
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_creativeId_fkey" FOREIGN KEY ("creativeId") REFERENCES "Creative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisplayCampaignAssignment" ADD CONSTRAINT "DisplayCampaignAssignment_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisplayCampaignAssignment" ADD CONSTRAINT "DisplayCampaignAssignment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

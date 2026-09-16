ALTER TABLE "Display" ADD COLUMN "lastLatitude" DOUBLE PRECISION,
ADD COLUMN "lastLongitude" DOUBLE PRECISION,
ADD COLUMN "lastLocationAccuracy" DOUBLE PRECISION,
ADD COLUMN "lastLocationAt" TIMESTAMP(3),
ADD COLUMN "lastHeartbeatAt" TIMESTAMP(3),
ADD COLUMN "currentCampaignId" TEXT,
ADD COLUMN "currentCreativeId" TEXT,
ADD COLUMN "currentAssetId" TEXT,
ADD COLUMN "currentPlaybackState" TEXT,
ADD COLUMN "currentPlaybackStartedAt" TIMESTAMP(3),
ADD COLUMN "currentPlaybackPositionMs" INTEGER,
ADD COLUMN "currentExpectedDurationMs" INTEGER,
ADD COLUMN "manufacturer" TEXT,
ADD COLUMN "model" TEXT,
ADD COLUMN "androidVersion" TEXT,
ADD COLUMN "batteryLevel" INTEGER,
ADD COLUMN "chargingState" TEXT,
ADD COLUMN "lastNetworkType" TEXT;

ALTER TABLE "DisplayHeartbeat" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "accuracyMeters" DOUBLE PRECISION,
ADD COLUMN "speedMps" DOUBLE PRECISION,
ADD COLUMN "headingDegrees" DOUBLE PRECISION,
ADD COLUMN "locationOccurredAt" TIMESTAMP(3),
ADD COLUMN "currentCampaignId" TEXT,
ADD COLUMN "currentAssetId" TEXT,
ADD COLUMN "playbackStartedAt" TIMESTAMP(3),
ADD COLUMN "playbackPositionMs" INTEGER,
ADD COLUMN "expectedDurationMs" INTEGER,
ADD COLUMN "manufacturer" TEXT,
ADD COLUMN "model" TEXT,
ADD COLUMN "androidVersion" TEXT,
ADD COLUMN "batteryLevel" INTEGER,
ADD COLUMN "chargingState" TEXT;

ALTER TABLE "ProofOfPlay" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "locationAccuracy" DOUBLE PRECISION,
ADD COLUMN "locationOccurredAt" TIMESTAMP(3);

ALTER TABLE "PlaybackEvent" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "locationAccuracy" DOUBLE PRECISION,
ADD COLUMN "locationOccurredAt" TIMESTAMP(3);

CREATE TABLE "DisplayLocationEvent" (
  "id" UUID NOT NULL,
  "displayId" UUID NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "accuracyMeters" DOUBLE PRECISION NOT NULL,
  "speedMps" DOUBLE PRECISION,
  "headingDegrees" DOUBLE PRECISION,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisplayLocationEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DisplayLocationEvent_displayId_occurredAt_idx" ON "DisplayLocationEvent"("displayId", "occurredAt");
CREATE INDEX "DisplayLocationEvent_occurredAt_idx" ON "DisplayLocationEvent"("occurredAt");
ALTER TABLE "DisplayLocationEvent" ADD CONSTRAINT "DisplayLocationEvent_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Creative" ADD COLUMN "qrEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Creative" ADD COLUMN "qrTargetUrl" TEXT;
ALTER TABLE "Creative" ADD COLUMN "qrLabel" TEXT;
ALTER TABLE "Creative" ADD COLUMN "qrVersion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "DisplayZoneConfig" (
  "id" UUID NOT NULL,
  "displayId" UUID NOT NULL,
  "primaryWidthPercent" INTEGER NOT NULL DEFAULT 67,
  "adHeightPercent" INTEGER NOT NULL DEFAULT 86,
  "qrHeightPercent" INTEGER NOT NULL DEFAULT 47,
  "newsScrollSpeed" INTEGER NOT NULL DEFAULT 42,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DisplayZoneConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DisplayZoneConfig_displayId_key" ON "DisplayZoneConfig"("displayId");
ALTER TABLE "DisplayZoneConfig" ADD CONSTRAINT "DisplayZoneConfig_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NewsAnnouncement" (
  "id" UUID NOT NULL,
  "text" TEXT NOT NULL,
  "city" TEXT,
  "vehicleId" UUID,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewsAnnouncement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NewsAnnouncement_active_startsAt_endsAt_idx" ON "NewsAnnouncement"("active", "startsAt", "endsAt");
CREATE INDEX "NewsAnnouncement_city_vehicleId_idx" ON "NewsAnnouncement"("city", "vehicleId");

ALTER TABLE "Campaign"
  ADD COLUMN "campaignCenterLat" DOUBLE PRECISION,
  ADD COLUMN "campaignCenterLng" DOUBLE PRECISION,
  ADD COLUMN "radiusKm" DOUBLE PRECISION,
  ADD COLUMN "forecastSnapshot" JSONB,
  ADD COLUMN "forecastGeneratedAt" TIMESTAMP(3),
  ADD COLUMN "forecastVersion" TEXT;

CREATE TABLE "ForecastSetting" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "averageRidesPerDay" INTEGER NOT NULL DEFAULT 12,
  "averagePassengersPerRide" INTEGER NOT NULL DEFAULT 2,
  "fallbackActiveAutoFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
  "minimumSelfServeBudget" INTEGER NOT NULL DEFAULT 1000,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ForecastSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ForecastSetting_key_key" ON "ForecastSetting"("key");

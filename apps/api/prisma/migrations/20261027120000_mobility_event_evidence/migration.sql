ALTER TABLE "MobilityEvent" ADD COLUMN "sourcePackage" TEXT;
ALTER TABLE "MobilityEvent" ADD COLUMN "evidenceClass" TEXT NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "MobilityEvent" ADD COLUMN "diagnosticCode" TEXT;

CREATE INDEX "MobilityEvent_driverId_provider_occurredAt_idx" ON "MobilityEvent"("driverId", "provider", "occurredAt");

-- These fields were added to the Prisma model but were missing from the
-- DeviceOS foundation migration. Existing API queries select all scalar
-- columns, so the schema mismatch caused Prisma P2022 / HTTP 500 responses.
ALTER TABLE "ManagedApplication"
  ADD COLUMN IF NOT EXISTS "critical" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "remoteUninstallAllowed" BOOLEAN NOT NULL DEFAULT false;

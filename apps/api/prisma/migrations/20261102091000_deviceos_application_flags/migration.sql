-- Repair additive DeviceOS columns that are present in the Prisma schema and
-- runtime but missing from the original DeviceOS foundation migration.
ALTER TABLE "ManagedApplication"
  ADD COLUMN IF NOT EXISTS "critical" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "remoteUninstallAllowed" BOOLEAN NOT NULL DEFAULT false;

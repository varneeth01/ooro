ALTER TABLE "ManagedApplication"
  ADD COLUMN "critical" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "remoteUninstallAllowed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "DeviceOsCommand" (
  "id" UUID NOT NULL,
  "managedDeviceId" UUID NOT NULL,
  "commandType" TEXT NOT NULL,
  "packageName" TEXT NOT NULL,
  "payload" JSONB,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  CONSTRAINT "DeviceOsCommand_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeviceOsCommand_managedDeviceId_fkey"
    FOREIGN KEY ("managedDeviceId") REFERENCES "ManagedDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DeviceOsCommand_managedDeviceId_status_createdAt_idx"
  ON "DeviceOsCommand"("managedDeviceId", "status", "createdAt");

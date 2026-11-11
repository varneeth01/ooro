CREATE TABLE "DriverDevice" (
  "id" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "installationId" TEXT NOT NULL,
  "appVersion" TEXT,
  "androidVersion" TEXT,
  "manufacturer" TEXT,
  "model" TEXT,
  "notificationState" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "locationState" TEXT NOT NULL DEFAULT 'UNKNOWN',
  "lastSeenAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DriverDevice_installationId_key" ON "DriverDevice"("installationId");
CREATE INDEX "DriverDevice_driverId_revokedAt_idx" ON "DriverDevice"("driverId", "revokedAt");
ALTER TABLE "DriverDevice" ADD CONSTRAINT "DriverDevice_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DriverPermissionGrant" (
  "id" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "permission" TEXT NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL DEFAULT 'ANDROID',
  "grantedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverPermissionGrant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DriverPermissionGrant_driverId_permission_key" ON "DriverPermissionGrant"("driverId", "permission");
CREATE INDEX "DriverPermissionGrant_driverId_granted_idx" ON "DriverPermissionGrant"("driverId", "granted");
ALTER TABLE "DriverPermissionGrant" ADD CONSTRAINT "DriverPermissionGrant_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BankBeneficiary" (
  "id" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "maskedAccount" TEXT NOT NULL,
  "secretRef" TEXT NOT NULL,
  "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BankBeneficiary_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BankBeneficiary_driverId_verificationStatus_idx" ON "BankBeneficiary"("driverId", "verificationStatus");
ALTER TABLE "BankBeneficiary" ADD CONSTRAINT "BankBeneficiary_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DutySession" (
  "id" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "driverDeviceId" UUID,
  "vehicleId" UUID,
  "displayId" UUID,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "endReason" TEXT,
  "lastLocationAt" TIMESTAMP(3),
  "lastEventAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DutySession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DutySession_driverId_status_idx" ON "DutySession"("driverId", "status");
CREATE INDEX "DutySession_driverId_startedAt_idx" ON "DutySession"("driverId", "startedAt");
ALTER TABLE "DutySession" ADD CONSTRAINT "DutySession_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DutySession" ADD CONSTRAINT "DutySession_driverDeviceId_fkey" FOREIGN KEY ("driverDeviceId") REFERENCES "DriverDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DriverActivationReview" (
  "id" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "decision" TEXT NOT NULL,
  "reason" TEXT,
  "actorId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverActivationReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DriverActivationReview_driverId_createdAt_idx" ON "DriverActivationReview"("driverId", "createdAt");
ALTER TABLE "DriverActivationReview" ADD CONSTRAINT "DriverActivationReview_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DocumentUploadSession" (
  "id" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "documentType" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentUploadSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DocumentUploadSession_objectKey_key" ON "DocumentUploadSession"("objectKey");
CREATE INDEX "DocumentUploadSession_driverId_status_idx" ON "DocumentUploadSession"("driverId", "status");
ALTER TABLE "DocumentUploadSession" ADD CONSTRAINT "DocumentUploadSession_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverConsent" ADD COLUMN "revokedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "DutySession_one_active_per_driver" ON "DutySession"("driverId") WHERE "status" = 'ACTIVE';

CREATE TABLE "DutyLocationEvent" (
  "id" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "dutySessionId" UUID NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "accuracy" DOUBLE PRECISION NOT NULL,
  "speed" DOUBLE PRECISION,
  "bearing" DOUBLE PRECISION,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DutyLocationEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DutyLocationEvent_dutySessionId_occurredAt_idx" ON "DutyLocationEvent"("dutySessionId", "occurredAt");
ALTER TABLE "DutyLocationEvent" ADD CONSTRAINT "DutyLocationEvent_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DutyLocationEvent" ADD CONSTRAINT "DutyLocationEvent_dutySessionId_fkey" FOREIGN KEY ("dutySessionId") REFERENCES "DutySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ManagedDevice" (
  "id" UUID NOT NULL,
  "displayId" UUID NOT NULL,
  "enrollmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "agentPackageName" TEXT NOT NULL DEFAULT 'com.ooro.deviceagent',
  "agentVersionName" TEXT,
  "agentVersionCode" BIGINT,
  "androidVersion" TEXT,
  "manufacturer" TEXT,
  "model" TEXT,
  "city" TEXT,
  "capabilities" JSONB,
  "lastSeenAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "desiredStateVersion" INTEGER NOT NULL DEFAULT 0,
  "rowVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManagedDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManagedDevice_displayId_key" ON "ManagedDevice"("displayId");
CREATE INDEX "ManagedDevice_enrollmentStatus_lastSeenAt_idx" ON "ManagedDevice"("enrollmentStatus", "lastSeenAt");
CREATE INDEX "ManagedDevice_city_enrollmentStatus_idx" ON "ManagedDevice"("city", "enrollmentStatus");
ALTER TABLE "ManagedDevice" ADD CONSTRAINT "ManagedDevice_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DeviceCredential" (
  "id" UUID NOT NULL,
  "managedDeviceId" UUID NOT NULL,
  "credentialId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceCredential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceCredential_credentialId_key" ON "DeviceCredential"("credentialId");
CREATE UNIQUE INDEX "DeviceCredential_tokenHash_key" ON "DeviceCredential"("tokenHash");
CREATE INDEX "DeviceCredential_managedDeviceId_revokedAt_expiresAt_idx" ON "DeviceCredential"("managedDeviceId", "revokedAt", "expiresAt");
ALTER TABLE "DeviceCredential" ADD CONSTRAINT "DeviceCredential_managedDeviceId_fkey" FOREIGN KEY ("managedDeviceId") REFERENCES "ManagedDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ManagedApplication" (
  "id" UUID NOT NULL,
  "packageName" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "allowed" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManagedApplication_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManagedApplication_packageName_key" ON "ManagedApplication"("packageName");
CREATE INDEX "ManagedApplication_allowed_updatedAt_idx" ON "ManagedApplication"("allowed", "updatedAt");

CREATE TABLE "ApplicationRelease" (
  "id" UUID NOT NULL,
  "applicationId" UUID NOT NULL,
  "versionCode" BIGINT NOT NULL,
  "versionName" TEXT NOT NULL,
  "minSdk" INTEGER NOT NULL,
  "targetSdk" INTEGER NOT NULL,
  "packageName" TEXT NOT NULL,
  "sha256" TEXT NOT NULL,
  "certificateSha256" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "metadata" JSONB,
  "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  "approvedBy" UUID,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApplicationRelease_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApplicationRelease_storageKey_key" ON "ApplicationRelease"("storageKey");
CREATE UNIQUE INDEX "ApplicationRelease_applicationId_versionCode_sha256_key" ON "ApplicationRelease"("applicationId", "versionCode", "sha256");
CREATE INDEX "ApplicationRelease_applicationId_approvalStatus_createdAt_idx" ON "ApplicationRelease"("applicationId", "approvalStatus", "createdAt");
ALTER TABLE "ApplicationRelease" ADD CONSTRAINT "ApplicationRelease_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ManagedApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DeploymentCampaign" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "applicationId" UUID NOT NULL,
  "releaseId" UUID NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'DRAFT',
  "targetingMode" TEXT NOT NULL DEFAULT 'DEVICES',
  "city" TEXT,
  "targetPercentage" INTEGER,
  "cohortSeed" TEXT NOT NULL,
  "maintenanceWindowStart" TIMESTAMP(3),
  "maintenanceWindowEnd" TIMESTAMP(3),
  "maxFailureRatePercent" INTEGER NOT NULL DEFAULT 10,
  "healthGate" JSONB,
  "pauseReason" TEXT,
  "createdBy" UUID,
  "pausedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeploymentCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DeploymentCampaign_state_createdAt_idx" ON "DeploymentCampaign"("state", "createdAt");
CREATE INDEX "DeploymentCampaign_applicationId_state_idx" ON "DeploymentCampaign"("applicationId", "state");
ALTER TABLE "DeploymentCampaign" ADD CONSTRAINT "DeploymentCampaign_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ManagedApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeploymentCampaign" ADD CONSTRAINT "DeploymentCampaign_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "ApplicationRelease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DeploymentTarget" (
  "id" UUID NOT NULL,
  "campaignId" UUID NOT NULL,
  "managedDeviceId" UUID NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "assignedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "rowVersion" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeploymentTarget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeploymentTarget_campaignId_managedDeviceId_key" ON "DeploymentTarget"("campaignId", "managedDeviceId");
CREATE INDEX "DeploymentTarget_managedDeviceId_state_nextAttemptAt_idx" ON "DeploymentTarget"("managedDeviceId", "state", "nextAttemptAt");
CREATE INDEX "DeploymentTarget_campaignId_state_idx" ON "DeploymentTarget"("campaignId", "state");
ALTER TABLE "DeploymentTarget" ADD CONSTRAINT "DeploymentTarget_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "DeploymentCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeploymentTarget" ADD CONSTRAINT "DeploymentTarget_managedDeviceId_fkey" FOREIGN KEY ("managedDeviceId") REFERENCES "ManagedDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DeploymentAttempt" (
  "id" UUID NOT NULL,
  "targetId" UUID NOT NULL,
  "managedDeviceId" UUID NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'ASSIGNED',
  "idempotencyKey" TEXT NOT NULL,
  "installerSessionId" TEXT,
  "bytesDownloaded" BIGINT,
  "checksumVerified" BOOLEAN NOT NULL DEFAULT false,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeploymentAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeploymentAttempt_idempotencyKey_key" ON "DeploymentAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "DeploymentAttempt_targetId_attemptNumber_key" ON "DeploymentAttempt"("targetId", "attemptNumber");
CREATE INDEX "DeploymentAttempt_managedDeviceId_state_createdAt_idx" ON "DeploymentAttempt"("managedDeviceId", "state", "createdAt");
ALTER TABLE "DeploymentAttempt" ADD CONSTRAINT "DeploymentAttempt_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "DeploymentTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeploymentAttempt" ADD CONSTRAINT "DeploymentAttempt_managedDeviceId_fkey" FOREIGN KEY ("managedDeviceId") REFERENCES "ManagedDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InstallationResult" (
  "id" UUID NOT NULL,
  "attemptId" UUID NOT NULL,
  "managedDeviceId" UUID NOT NULL,
  "packageName" TEXT NOT NULL,
  "installedVersionCode" BIGINT,
  "installedVersionName" TEXT,
  "installerStatus" TEXT NOT NULL,
  "installerMessage" TEXT,
  "healthStatus" TEXT,
  "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "healthyAt" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "InstallationResult_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InstallationResult_attemptId_key" ON "InstallationResult"("attemptId");
CREATE INDEX "InstallationResult_managedDeviceId_packageName_reportedAt_idx" ON "InstallationResult"("managedDeviceId", "packageName", "reportedAt");
ALTER TABLE "InstallationResult" ADD CONSTRAINT "InstallationResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "DeploymentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstallationResult" ADD CONSTRAINT "InstallationResult_managedDeviceId_fkey" FOREIGN KEY ("managedDeviceId") REFERENCES "ManagedDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DeviceApplicationInventory" (
  "id" UUID NOT NULL,
  "managedDeviceId" UUID NOT NULL,
  "applicationId" UUID,
  "packageName" TEXT NOT NULL,
  "versionCode" BIGINT NOT NULL,
  "versionName" TEXT,
  "certificateSha256" TEXT,
  "installSource" TEXT,
  "isCompliant" BOOLEAN NOT NULL DEFAULT false,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "DeviceApplicationInventory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceApplicationInventory_managedDeviceId_packageName_key" ON "DeviceApplicationInventory"("managedDeviceId", "packageName");
CREATE INDEX "DeviceApplicationInventory_packageName_lastSeenAt_idx" ON "DeviceApplicationInventory"("packageName", "lastSeenAt");
ALTER TABLE "DeviceApplicationInventory" ADD CONSTRAINT "DeviceApplicationInventory_managedDeviceId_fkey" FOREIGN KEY ("managedDeviceId") REFERENCES "ManagedDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeviceApplicationInventory" ADD CONSTRAINT "DeviceApplicationInventory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ManagedApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DeviceOsAuditEvent" (
  "id" UUID NOT NULL,
  "managedDeviceId" UUID,
  "campaignId" UUID,
  "actorId" UUID,
  "actorRole" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "requestId" TEXT,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceOsAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DeviceOsAuditEvent_managedDeviceId_createdAt_idx" ON "DeviceOsAuditEvent"("managedDeviceId", "createdAt");
CREATE INDEX "DeviceOsAuditEvent_campaignId_createdAt_idx" ON "DeviceOsAuditEvent"("campaignId", "createdAt");
CREATE INDEX "DeviceOsAuditEvent_entityType_entityId_createdAt_idx" ON "DeviceOsAuditEvent"("entityType", "entityId", "createdAt");
ALTER TABLE "DeviceOsAuditEvent" ADD CONSTRAINT "DeviceOsAuditEvent_managedDeviceId_fkey" FOREIGN KEY ("managedDeviceId") REFERENCES "ManagedDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeviceOsAuditEvent" ADD CONSTRAINT "DeviceOsAuditEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "DeploymentCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeploymentCampaign" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "DeploymentCampaign_idempotencyKey_key" ON "DeploymentCampaign"("idempotencyKey");

CREATE TABLE "DeviceRequestReceipt" (
  "id" UUID NOT NULL,
  "managedDeviceId" UUID NOT NULL,
  "requestId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeviceRequestReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeviceRequestReceipt_managedDeviceId_requestId_key" ON "DeviceRequestReceipt"("managedDeviceId", "requestId");
CREATE INDEX "DeviceRequestReceipt_managedDeviceId_receivedAt_idx" ON "DeviceRequestReceipt"("managedDeviceId", "receivedAt");
ALTER TABLE "DeviceRequestReceipt" ADD CONSTRAINT "DeviceRequestReceipt_managedDeviceId_fkey" FOREIGN KEY ("managedDeviceId") REFERENCES "ManagedDevice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

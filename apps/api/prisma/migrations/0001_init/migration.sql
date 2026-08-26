-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'DRIVER',
    "accountStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "driverType" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "onboardingStatus" TEXT NOT NULL DEFAULT 'PROFILE',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'English',
    "city" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "profilePhotoUrl" TEXT,
    "emergencyContact" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetInquiry" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "companyName" TEXT,
    "city" TEXT,
    "fleetSize" INTEGER,
    "vehicleTypes" TEXT[],
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "maskedDocumentNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "cabType" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "fuelType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Display" (
    "id" UUID NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownershipType" TEXT,
    "vehicleId" UUID,
    "deviceTokenHash" TEXT,
    "state" TEXT NOT NULL DEFAULT 'UNPAIRED',
    "appVersion" TEXT,
    "manifestVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Display_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisplayPairingCode" (
    "id" UUID NOT NULL,
    "displayId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeLast4" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisplayPairingCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisplayHeartbeat" (
    "id" UUID NOT NULL,
    "displayId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appVersion" TEXT,
    "deviceVersion" TEXT,
    "storageFree" BIGINT,
    "storageTotal" BIGINT,
    "networkType" TEXT,
    "networkConnected" BOOLEAN,
    "manifestVersion" INTEGER,
    "currentCreativeId" TEXT,
    "playbackState" TEXT,
    "screenState" TEXT,
    "temperature" DOUBLE PRECISION,

    CONSTRAINT "DisplayHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisplayCommand" (
    "id" UUID NOT NULL,
    "displayId" UUID NOT NULL,
    "commandType" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "DisplayCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityIntegration" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "lastEventAt" TIMESTAMP(3),
    "parserVersion" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'DISCONNECTED',

    CONSTRAINT "MobilityIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobilityEvent" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "driverId" UUID NOT NULL,
    "vehicleId" UUID,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION NOT NULL,
    "source" TEXT,
    "parserVersion" INTEGER,
    "rawAllowed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MobilityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideCandidate" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "vehicleId" UUID,
    "displayId" UUID,
    "provider" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DETECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastEventAt" TIMESTAMP(3) NOT NULL,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "RideCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ride" (
    "id" UUID NOT NULL,
    "candidateId" UUID,
    "driverId" UUID NOT NULL,
    "vehicleId" UUID,
    "displayId" UUID,
    "provider" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RIDE_ACCEPTED',
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "distanceMeters" DOUBLE PRECISION,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideEvent" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "rideId" UUID,
    "candidateId" UUID,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION NOT NULL,
    "source" TEXT,

    CONSTRAINT "RideEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideLocation" (
    "id" UUID NOT NULL,
    "rideId" UUID NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "bearing" DOUBLE PRECISION,

    CONSTRAINT "RideLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideVerification" (
    "id" UUID NOT NULL,
    "rideId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reasons" TEXT[],
    "verifiedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewReason" TEXT,

    CONSTRAINT "RideVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudSignal" (
    "id" UUID NOT NULL,
    "rideId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignSession" (
    "id" UUID NOT NULL,
    "rideId" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "vehicleId" UUID,
    "displayId" UUID,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "manifestVersion" INTEGER,

    CONSTRAINT "CampaignSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybackEvent" (
    "id" UUID NOT NULL,
    "eventId" TEXT NOT NULL,
    "displayId" UUID NOT NULL,
    "rideId" UUID,
    "campaignSessionId" UUID,
    "campaignId" TEXT,
    "creativeId" TEXT,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "position" INTEGER,
    "duration" INTEGER,
    "manifestVersion" INTEGER,
    "playerVersion" TEXT,
    "errorCode" TEXT,

    CONSTRAINT "PlaybackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofOfPlay" (
    "id" UUID NOT NULL,
    "proofId" TEXT NOT NULL,
    "rideId" UUID NOT NULL,
    "displayId" UUID NOT NULL,
    "campaignSessionId" UUID,
    "campaignId" TEXT,
    "creativeId" TEXT,
    "playbackStartedAt" TIMESTAMP(3) NOT NULL,
    "playbackEndedAt" TIMESTAMP(3),
    "expectedDuration" INTEGER NOT NULL,
    "actualDuration" INTEGER,
    "manifestVersion" INTEGER,
    "playerVersion" TEXT,
    "playbackCompleted" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invalidReason" TEXT,
    "displayHeartbeatId" TEXT,

    CONSTRAINT "ProofOfPlay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarningEntry" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "rideId" UUID,
    "campaignSessionId" UUID,
    "type" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "availableAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarningEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutMethod" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "maskedValue" TEXT NOT NULL,
    "secretRef" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "payoutMethodId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "providerRef" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafetyIncident" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "vehicleId" UUID,
    "rideId" UUID,
    "type" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,

    CONSTRAINT "SafetyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoadsideRequest" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "vehicleId" UUID,
    "issueType" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "provider" TEXT,
    "estimatedArrival" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadsideRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "rideId" TEXT,
    "displayId" TEXT,
    "vehicleId" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementVersion" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "contentUrl" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverConsent" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "agreementVersionId" UUID NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "OtpChallenge_phone_expiresAt_idx" ON "OtpChallenge"("phone", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE INDEX "KycDocument_driverId_status_idx" ON "KycDocument"("driverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_registrationNumber_key" ON "Vehicle"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Display_deviceId_key" ON "Display"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Display_deviceTokenHash_key" ON "Display"("deviceTokenHash");

-- CreateIndex
CREATE INDEX "Display_vehicleId_state_idx" ON "Display"("vehicleId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "DisplayPairingCode_codeHash_key" ON "DisplayPairingCode"("codeHash");

-- CreateIndex
CREATE INDEX "DisplayPairingCode_displayId_expiresAt_idx" ON "DisplayPairingCode"("displayId", "expiresAt");

-- CreateIndex
CREATE INDEX "DisplayHeartbeat_displayId_occurredAt_idx" ON "DisplayHeartbeat"("displayId", "occurredAt");

-- CreateIndex
CREATE INDEX "DisplayCommand_displayId_status_idx" ON "DisplayCommand"("displayId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MobilityIntegration_driverId_provider_key" ON "MobilityIntegration"("driverId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "MobilityEvent_eventId_key" ON "MobilityEvent"("eventId");

-- CreateIndex
CREATE INDEX "MobilityEvent_driverId_occurredAt_idx" ON "MobilityEvent"("driverId", "occurredAt");

-- CreateIndex
CREATE INDEX "RideCandidate_driverId_state_idx" ON "RideCandidate"("driverId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Ride_candidateId_key" ON "Ride"("candidateId");

-- CreateIndex
CREATE INDEX "Ride_driverId_state_idx" ON "Ride"("driverId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "RideEvent_eventId_key" ON "RideEvent"("eventId");

-- CreateIndex
CREATE INDEX "RideEvent_rideId_occurredAt_idx" ON "RideEvent"("rideId", "occurredAt");

-- CreateIndex
CREATE INDEX "RideLocation_rideId_occurredAt_idx" ON "RideLocation"("rideId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RideVerification_rideId_key" ON "RideVerification"("rideId");

-- CreateIndex
CREATE INDEX "FraudSignal_rideId_idx" ON "FraudSignal"("rideId");

-- CreateIndex
CREATE INDEX "CampaignSession_displayId_status_idx" ON "CampaignSession"("displayId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlaybackEvent_eventId_key" ON "PlaybackEvent"("eventId");

-- CreateIndex
CREATE INDEX "PlaybackEvent_displayId_occurredAt_idx" ON "PlaybackEvent"("displayId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProofOfPlay_proofId_key" ON "ProofOfPlay"("proofId");

-- CreateIndex
CREATE INDEX "ProofOfPlay_rideId_status_idx" ON "ProofOfPlay"("rideId", "status");

-- CreateIndex
CREATE INDEX "EarningEntry_driverId_status_createdAt_idx" ON "EarningEntry"("driverId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_idempotencyKey_key" ON "Payout"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payout_driverId_status_idx" ON "Payout"("driverId", "status");

-- CreateIndex
CREATE INDEX "SafetyIncident_driverId_status_idx" ON "SafetyIncident"("driverId", "status");

-- CreateIndex
CREATE INDEX "RoadsideRequest_driverId_status_idx" ON "RoadsideRequest"("driverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementVersion_type_version_key" ON "AgreementVersion"("type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DriverConsent_driverId_agreementVersionId_key" ON "DriverConsent"("driverId", "agreementVersionId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "IdempotencyKey"("key");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Display" ADD CONSTRAINT "Display_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayPairingCode" ADD CONSTRAINT "DisplayPairingCode_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayHeartbeat" ADD CONSTRAINT "DisplayHeartbeat_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayCommand" ADD CONSTRAINT "DisplayCommand_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityIntegration" ADD CONSTRAINT "MobilityIntegration_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobilityEvent" ADD CONSTRAINT "MobilityEvent_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideCandidate" ADD CONSTRAINT "RideCandidate_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideCandidate" ADD CONSTRAINT "RideCandidate_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideCandidate" ADD CONSTRAINT "RideCandidate_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "RideCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideEvent" ADD CONSTRAINT "RideEvent_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideEvent" ADD CONSTRAINT "RideEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "RideCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideLocation" ADD CONSTRAINT "RideLocation_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideVerification" ADD CONSTRAINT "RideVerification_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudSignal" ADD CONSTRAINT "FraudSignal_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSession" ADD CONSTRAINT "CampaignSession_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSession" ADD CONSTRAINT "CampaignSession_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackEvent" ADD CONSTRAINT "PlaybackEvent_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackEvent" ADD CONSTRAINT "PlaybackEvent_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybackEvent" ADD CONSTRAINT "PlaybackEvent_campaignSessionId_fkey" FOREIGN KEY ("campaignSessionId") REFERENCES "CampaignSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfPlay" ADD CONSTRAINT "ProofOfPlay_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfPlay" ADD CONSTRAINT "ProofOfPlay_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfPlay" ADD CONSTRAINT "ProofOfPlay_campaignSessionId_fkey" FOREIGN KEY ("campaignSessionId") REFERENCES "CampaignSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningEntry" ADD CONSTRAINT "EarningEntry_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningEntry" ADD CONSTRAINT "EarningEntry_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningEntry" ADD CONSTRAINT "EarningEntry_campaignSessionId_fkey" FOREIGN KEY ("campaignSessionId") REFERENCES "CampaignSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutMethod" ADD CONSTRAINT "PayoutMethod_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_payoutMethodId_fkey" FOREIGN KEY ("payoutMethodId") REFERENCES "PayoutMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafetyIncident" ADD CONSTRAINT "SafetyIncident_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoadsideRequest" ADD CONSTRAINT "RoadsideRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverConsent" ADD CONSTRAINT "DriverConsent_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverConsent" ADD CONSTRAINT "DriverConsent_agreementVersionId_fkey" FOREIGN KEY ("agreementVersionId") REFERENCES "AgreementVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'CONSUMER',
    "domain" TEXT,
    "website" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Organization_type_verificationStatus_updatedAt_idx" ON "Organization"("type", "verificationStatus", "updatedAt");

CREATE TABLE "OrganizationMember" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "VerificationRequest" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationRequest_status_requestedAt_idx" ON "VerificationRequest"("status", "requestedAt");
CREATE INDEX "VerificationRequest_organizationId_requestedAt_idx" ON "VerificationRequest"("organizationId", "requestedAt");
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "VerificationHistory" (
    "id" UUID NOT NULL,
    "verificationRequestId" UUID NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reviewerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "VerificationHistory_verificationRequestId_createdAt_idx" ON "VerificationHistory"("verificationRequestId", "createdAt");
ALTER TABLE "VerificationHistory" ADD CONSTRAINT "VerificationHistory_verificationRequestId_fkey" FOREIGN KEY ("verificationRequestId") REFERENCES "VerificationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PricingPlan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "customerType" TEXT NOT NULL,
    "commitmentMonths" INTEGER,
    "autoDayRate" INTEGER,
    "impressionRate" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PricingPlan_customerType_active_isPublic_idx" ON "PricingPlan"("customerType", "active", "isPublic");

CREATE TABLE "OrganizationPricingOverride" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "pricingPlanId" UUID NOT NULL,
    "customRate" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    CONSTRAINT "OrganizationPricingOverride_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrganizationPricingOverride_organizationId_pricingPlanId_effectiveFrom_key" ON "OrganizationPricingOverride"("organizationId", "pricingPlanId", "effectiveFrom");
CREATE INDEX "OrganizationPricingOverride_organizationId_effectiveFrom_effectiveUntil_idx" ON "OrganizationPricingOverride"("organizationId", "effectiveFrom", "effectiveUntil");
ALTER TABLE "OrganizationPricingOverride" ADD CONSTRAINT "OrganizationPricingOverride_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationPricingOverride" ADD CONSTRAINT "OrganizationPricingOverride_pricingPlanId_fkey" FOREIGN KEY ("pricingPlanId") REFERENCES "PricingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AgencyProfile" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "applicationStatus" TEXT NOT NULL DEFAULT 'APPLICATION_RECEIVED',
    "salesStage" TEXT NOT NULL DEFAULT 'NEW_LEAD',
    "monthlySpendEstimate" INTEGER,
    "clientCount" INTEGER,
    "headquarters" TEXT,
    "teamSize" TEXT,
    "primaryMarkets" TEXT,
    "clientCategories" TEXT,
    "gstDetails" TEXT,
    "salesOwner" TEXT,
    "nextFollowUp" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgencyProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AgencyProfile_organizationId_key" ON "AgencyProfile"("organizationId");
ALTER TABLE "AgencyProfile" ADD CONSTRAINT "AgencyProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AgencyClient" (
    "id" UUID NOT NULL,
    "agencyOrganizationId" UUID NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientBrandId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgencyClient_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AgencyClient_agencyOrganizationId_status_updatedAt_idx" ON "AgencyClient"("agencyOrganizationId", "status", "updatedAt");
ALTER TABLE "AgencyClient" ADD CONSTRAINT "AgencyClient_agencyOrganizationId_fkey" FOREIGN KEY ("agencyOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InventoryAllocation" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "screenId" UUID NOT NULL,
    "autoId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "slot" INTEGER NOT NULL,
    "rate" INTEGER,
    "pricingSource" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryAllocation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InventoryAllocation_screenId_date_slot_key" ON "InventoryAllocation"("screenId", "date", "slot");
CREATE INDEX "InventoryAllocation_campaignId_date_status_idx" ON "InventoryAllocation"("campaignId", "date", "status");

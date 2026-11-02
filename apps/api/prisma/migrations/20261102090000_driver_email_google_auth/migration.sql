-- Additive driver authentication storage. Existing phone identities, sessions,
-- KYC, vehicles, displays, duty, earnings, payouts and admin auth are retained.
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);

CREATE TABLE "DriverEmailOtpChallenge" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "requestedIp" TEXT,
  "driverId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DriverEmailOtpChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DriverEmailOtpChallenge_email_createdAt_idx" ON "DriverEmailOtpChallenge"("email", "createdAt");
CREATE INDEX "DriverEmailOtpChallenge_requestedIp_createdAt_idx" ON "DriverEmailOtpChallenge"("requestedIp", "createdAt");
CREATE INDEX "DriverEmailOtpChallenge_driverId_createdAt_idx" ON "DriverEmailOtpChallenge"("driverId", "createdAt");
ALTER TABLE "DriverEmailOtpChallenge" ADD CONSTRAINT "DriverEmailOtpChallenge_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DriverAuthIdentity" (
  "id" UUID NOT NULL,
  "driverId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "email" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DriverAuthIdentity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DriverAuthIdentity_provider_subject_key" ON "DriverAuthIdentity"("provider", "subject");
CREATE UNIQUE INDEX "DriverAuthIdentity_driverId_provider_key" ON "DriverAuthIdentity"("driverId", "provider");
CREATE INDEX "DriverAuthIdentity_userId_provider_idx" ON "DriverAuthIdentity"("userId", "provider");
ALTER TABLE "DriverAuthIdentity" ADD CONSTRAINT "DriverAuthIdentity_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverAuthIdentity" ADD CONSTRAINT "DriverAuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

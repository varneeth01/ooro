-- Non-destructive admin authentication migration.
-- Existing users, roles, sessions, and driver/device authentication are preserved.
ALTER TABLE "User"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "passwordSetupTokenHash" TEXT,
  ADD COLUMN "passwordSetupTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetTokenHash" TEXT,
  ADD COLUMN "passwordResetTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "passwordChangedAt" TIMESTAMP(3),
  ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_passwordSetupTokenHash_key" ON "User"("passwordSetupTokenHash");
CREATE UNIQUE INDEX "User_passwordResetTokenHash_key" ON "User"("passwordResetTokenHash");

ALTER TABLE "Session"
  ADD COLUMN "userAgent" TEXT,
  ADD COLUMN "ipAddress" TEXT;

CREATE TABLE "AdminLoginAttempt" (
  "id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "blockedUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminLoginAttempt_key_key" ON "AdminLoginAttempt"("key");
CREATE INDEX "AdminLoginAttempt_blockedUntil_idx" ON "AdminLoginAttempt"("blockedUntil");

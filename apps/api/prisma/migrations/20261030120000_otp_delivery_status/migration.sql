ALTER TABLE "OtpChallenge"
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerMessageId" TEXT,
  ADD COLUMN "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "deliveryErrorCode" TEXT,
  ADD COLUMN "deliveryUpdatedAt" TIMESTAMP(3);

CREATE INDEX "OtpChallenge_providerMessageId_idx" ON "OtpChallenge"("providerMessageId");
CREATE INDEX "OtpChallenge_deliveryStatus_createdAt_idx" ON "OtpChallenge"("deliveryStatus", "createdAt");

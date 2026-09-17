ALTER TABLE "Campaign" ADD COLUMN "commercialFundingStatus" TEXT NOT NULL DEFAULT 'UNFUNDED';
ALTER TABLE "ScreenInventoryConfig" ADD COLUMN "commercialEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ScreenInventoryConfig" ADD COLUMN "city" TEXT;
ALTER TABLE "ScreenInventoryConfig" ADD COLUMN "coverage" JSONB;
ALTER TABLE "ScreenInventoryConfig" ADD COLUMN "premiumEligible" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "AdBalanceAccount" (
  "id" UUID NOT NULL,
  "accountId" TEXT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "cachedBalancePaise" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdBalanceAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdBalanceAccount_accountId_key" ON "AdBalanceAccount"("accountId");
CREATE INDEX "AdBalanceAccount_accountId_idx" ON "AdBalanceAccount"("accountId");
CREATE TABLE "AdBalanceLedgerEntry" (
  "id" UUID NOT NULL,
  "accountId" UUID NOT NULL,
  "type" TEXT NOT NULL,
  "amountPaise" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "campaignId" TEXT,
  "razorpayOrderId" TEXT,
  "razorpayPaymentId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdBalanceLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdBalanceLedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "AdBalanceAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AdBalanceLedgerEntry_idempotencyKey_key" ON "AdBalanceLedgerEntry"("idempotencyKey");
CREATE INDEX "AdBalanceLedgerEntry_accountId_createdAt_idx" ON "AdBalanceLedgerEntry"("accountId", "createdAt");
CREATE INDEX "AdBalanceLedgerEntry_campaignId_createdAt_idx" ON "AdBalanceLedgerEntry"("campaignId", "createdAt");
CREATE TABLE "AdBalanceRechargeOrder" (
  "id" UUID NOT NULL,
  "accountId" TEXT NOT NULL,
  "razorpayOrderId" TEXT NOT NULL,
  "amountPaise" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'CREATED',
  "razorpayPaymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdBalanceRechargeOrder_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdBalanceRechargeOrder_razorpayOrderId_key" ON "AdBalanceRechargeOrder"("razorpayOrderId");
CREATE INDEX "AdBalanceRechargeOrder_accountId_createdAt_idx" ON "AdBalanceRechargeOrder"("accountId", "createdAt");

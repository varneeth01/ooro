ALTER TABLE "PricingPlan"
ADD COLUMN IF NOT EXISTS "deliveryTier" TEXT NOT NULL DEFAULT 'STANDARD';

UPDATE "PricingPlan"
SET "name" = 'Standard', "deliveryTier" = 'STANDARD', "impressionRate" = 5, "autoDayRate" = NULL, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '10000000-0000-0000-0000-000000000001';

UPDATE "PricingPlan"
SET "name" = 'Premium+', "deliveryTier" = 'PREMIUM_PLUS', "impressionRate" = 10, "autoDayRate" = NULL, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '10000000-0000-0000-0000-000000000002';

UPDATE "PricingPlan"
SET "name" = 'Brand · Standard · 1 month', "customerType" = 'BRAND', "commitmentMonths" = 1, "autoDayRate" = 59, "impressionRate" = NULL, "deliveryTier" = 'STANDARD', "isPublic" = false, "active" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '10000000-0000-0000-0000-000000000011';

UPDATE "PricingPlan"
SET "name" = 'Brand · Standard · 3+ months', "customerType" = 'BRAND', "commitmentMonths" = 3, "autoDayRate" = 59, "impressionRate" = NULL, "deliveryTier" = 'STANDARD', "isPublic" = false, "active" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '10000000-0000-0000-0000-000000000012';

UPDATE "PricingPlan"
SET "name" = 'Brand · Standard · 6+ months', "customerType" = 'BRAND', "commitmentMonths" = 6, "autoDayRate" = 59, "impressionRate" = NULL, "deliveryTier" = 'STANDARD', "isPublic" = false, "active" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '10000000-0000-0000-0000-000000000013';

UPDATE "PricingPlan"
SET "name" = 'Agency · Standard · 1 month', "customerType" = 'AGENCY', "commitmentMonths" = 1, "autoDayRate" = 49, "impressionRate" = NULL, "deliveryTier" = 'STANDARD', "isPublic" = false, "active" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '10000000-0000-0000-0000-000000000021';

UPDATE "PricingPlan"
SET "name" = 'Agency · Standard · 3+ months', "customerType" = 'AGENCY', "commitmentMonths" = 3, "autoDayRate" = 49, "impressionRate" = NULL, "deliveryTier" = 'STANDARD', "isPublic" = false, "active" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '10000000-0000-0000-0000-000000000022';

UPDATE "PricingPlan"
SET "name" = 'Agency · Standard · 6+ months', "customerType" = 'AGENCY', "commitmentMonths" = 6, "autoDayRate" = 49, "impressionRate" = NULL, "deliveryTier" = 'STANDARD', "isPublic" = false, "active" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = '10000000-0000-0000-0000-000000000023';

INSERT INTO "PricingPlan" ("id", "name", "customerType", "commitmentMonths", "autoDayRate", "impressionRate", "deliveryTier", "isPublic", "active", "createdAt", "updatedAt")
VALUES
  ('10000000-0000-0000-0000-000000000031', 'Brand · Premium slot · 1 month', 'BRAND', 1, 69, NULL, 'PREMIUM_PLUS', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-0000-0000-000000000032', 'Brand · Premium slot · 3+ months', 'BRAND', 3, 69, NULL, 'PREMIUM_PLUS', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-0000-0000-000000000041', 'Agency · Premium slot · 1 month', 'AGENCY', 1, 69, NULL, 'PREMIUM_PLUS', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-0000-0000-000000000042', 'Agency · Premium slot · 3+ months', 'AGENCY', 3, 69, NULL, 'PREMIUM_PLUS', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "customerType" = EXCLUDED."customerType",
  "commitmentMonths" = EXCLUDED."commitmentMonths",
  "autoDayRate" = EXCLUDED."autoDayRate",
  "impressionRate" = EXCLUDED."impressionRate",
  "deliveryTier" = EXCLUDED."deliveryTier",
  "isPublic" = EXCLUDED."isPublic",
  "active" = EXCLUDED."active",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "PricingPlan" ("id", "name", "customerType", "commitmentMonths", "autoDayRate", "impressionRate", "deliveryTier", "isPublic", "active", "createdAt", "updatedAt")
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Standard', 'SELF_SERVE', NULL, NULL, 5, 'STANDARD', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-0000-0000-000000000002', 'Premium+', 'SELF_SERVE', NULL, NULL, 10, 'PREMIUM_PLUS', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-0000-0000-000000000011', 'Brand · Standard · 1 month', 'BRAND', 1, 59, NULL, 'STANDARD', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-0000-0000-000000000012', 'Brand · Standard · 3+ months', 'BRAND', 3, 59, NULL, 'STANDARD', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-0000-0000-000000000013', 'Brand · Standard · 6+ months', 'BRAND', 6, 59, NULL, 'STANDARD', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-0000-0000-000000000021', 'Agency · Standard · 1 month', 'AGENCY', 1, 49, NULL, 'STANDARD', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-0000-0000-000000000022', 'Agency · Standard · 3+ months', 'AGENCY', 3, 49, NULL, 'STANDARD', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-0000-0000-000000000023', 'Agency · Standard · 6+ months', 'AGENCY', 6, 49, NULL, 'STANDARD', false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "customerType" = EXCLUDED."customerType",
  "commitmentMonths" = EXCLUDED."commitmentMonths",
  "autoDayRate" = EXCLUDED."autoDayRate",
  "impressionRate" = EXCLUDED."impressionRate",
  "deliveryTier" = EXCLUDED."deliveryTier",
  "isPublic" = EXCLUDED."isPublic",
  "active" = EXCLUDED."active",
  "updatedAt" = CURRENT_TIMESTAMP;

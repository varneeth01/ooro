ALTER TABLE "Campaign" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "description" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "metadata" JSONB;
CREATE INDEX "Campaign_ownerEmail_status_idx" ON "Campaign"("ownerEmail", "status");
ALTER TABLE "Asset" ADD COLUMN "fileName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Asset" ADD COLUMN "storageKey" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Asset" ADD COLUMN "width" INTEGER;
ALTER TABLE "Asset" ADD COLUMN "height" INTEGER;
ALTER TABLE "Asset" ADD COLUMN "durationSeconds" INTEGER;

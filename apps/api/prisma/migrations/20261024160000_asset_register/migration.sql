CREATE TABLE "CompanyAsset" (
"id" UUID NOT NULL, "assetCode" TEXT NOT NULL, "title" TEXT NOT NULL,
"kind" TEXT NOT NULL DEFAULT 'DISPLAY', "status" TEXT NOT NULL DEFAULT 'DOCUMENTS_PENDING',
"ownershipStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED', "legalEntityName" TEXT NOT NULL DEFAULT 'ANOK Private Limited',
"serialNumber" TEXT, "deviceId" TEXT, "acquisitionCostPaise" INTEGER, "notes" TEXT,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "CompanyAsset_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "CompanyAsset_assetCode_key" ON "CompanyAsset"("assetCode");
CREATE TABLE "AssetDocument" (
"id" UUID NOT NULL, "assetId" UUID NOT NULL, "type" TEXT NOT NULL, "objectKey" TEXT NOT NULL,
"filename" TEXT NOT NULL, "contentType" TEXT NOT NULL, "sizeBytes" INTEGER NOT NULL,
"uploadedById" UUID NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "AssetDocument_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AssetDocument_objectKey_key" ON "AssetDocument"("objectKey");
CREATE INDEX "AssetDocument_assetId_idx" ON "AssetDocument"("assetId");
ALTER TABLE "AssetDocument" ADD CONSTRAINT "AssetDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CompanyAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "AssetEvent" (
"id" UUID NOT NULL, "assetId" UUID NOT NULL, "actorId" UUID, "action" TEXT NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "AssetEvent_pkey" PRIMARY KEY ("id"));
CREATE INDEX "AssetEvent_assetId_createdAt_idx" ON "AssetEvent"("assetId", "createdAt");
ALTER TABLE "AssetEvent" ADD CONSTRAINT "AssetEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CompanyAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

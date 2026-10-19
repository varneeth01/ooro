-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "area" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "depotId" UUID,
ADD COLUMN     "routeId" UUID;

-- AlterTable
ALTER TABLE "Display" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "InventoryAllocation" ADD COLUMN     "scheduleId" UUID;

-- CreateTable
CREATE TABLE "Depot" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "Depot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "depotId" UUID,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenGroup" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ScreenGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenGroupMember" (
    "groupId" UUID NOT NULL,
    "displayId" UUID NOT NULL,

    CONSTRAINT "ScreenGroupMember_pkey" PRIMARY KEY ("groupId","displayId")
);

-- CreateTable
CREATE TABLE "AdSchedule" (
    "id" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "exclusive" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "rules" JSONB NOT NULL,
    "targeting" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScreenGroup_name_key" ON "ScreenGroup"("name");

-- CreateIndex
CREATE INDEX "ScreenGroupMember_displayId_idx" ON "ScreenGroupMember"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "AdSchedule_campaignId_key" ON "AdSchedule"("campaignId");

-- CreateIndex
CREATE INDEX "AdSchedule_status_startsAt_endsAt_idx" ON "AdSchedule"("status", "startsAt", "endsAt");

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenGroupMember" ADD CONSTRAINT "ScreenGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScreenGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenGroupMember" ADD CONSTRAINT "ScreenGroupMember_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdSchedule" ADD CONSTRAINT "AdSchedule_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Existing ACTIVE creatives were already enabled for playback; retain that explicit state.
UPDATE "Creative" SET "status" = 'APPROVED' WHERE "status" = 'ACTIVE';
ALTER TABLE "Creative" ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW';

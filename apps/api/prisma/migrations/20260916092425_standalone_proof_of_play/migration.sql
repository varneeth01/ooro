-- DropForeignKey
ALTER TABLE "ProofOfPlay" DROP CONSTRAINT "ProofOfPlay_rideId_fkey";

-- AlterTable
ALTER TABLE "ProofOfPlay" ADD COLUMN     "assetId" TEXT,
ALTER COLUMN "rideId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ProofOfPlay" ADD CONSTRAINT "ProofOfPlay_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- V3 display contract and explicit sponsored placement attribution.
-- Existing campaigns and displays retain their established main/V2 behavior.
ALTER TABLE "Campaign" ADD COLUMN "deliverySlot" TEXT NOT NULL DEFAULT 'MAIN';
ALTER TABLE "DisplayZoneConfig" ADD COLUMN "layoutContractVersion" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "ProofOfPlay" ADD COLUMN "slot" TEXT NOT NULL DEFAULT 'MAIN';

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_deliverySlot_check"
  CHECK ("deliverySlot" IN ('MAIN', 'SPONSORED'));
ALTER TABLE "DisplayZoneConfig" ADD CONSTRAINT "DisplayZoneConfig_layoutContractVersion_check"
  CHECK ("layoutContractVersion" IN (1, 2, 3));
ALTER TABLE "ProofOfPlay" ADD CONSTRAINT "ProofOfPlay_slot_check"
  CHECK ("slot" IN ('MAIN', 'SPONSORED'));

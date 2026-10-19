-- Additive DeviceOS deployment idempotency targeting metadata.
ALTER TABLE "DeploymentCampaign" ADD COLUMN "targetingSpec" JSONB;

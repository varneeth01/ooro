ALTER TABLE "ProofOfPlay" ADD COLUMN "scheduleItemId" TEXT;
CREATE INDEX "ProofOfPlay_campaignId_playbackStartedAt_idx" ON "ProofOfPlay"("campaignId", "playbackStartedAt");
CREATE INDEX "ProofOfPlay_displayId_playbackStartedAt_idx" ON "ProofOfPlay"("displayId", "playbackStartedAt");
CREATE INDEX "ProofOfPlay_playbackStartedAt_idx" ON "ProofOfPlay"("playbackStartedAt");

-- Additive Layout Studio V1 persistence. Existing display assignments and
-- campaign authorization are untouched; no rows are backfilled or activated.
CREATE TABLE "LayoutTemplate" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "preset" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "profileId" TEXT NOT NULL,
    "draftContract" JSONB NOT NULL,
    "rowVersion" INTEGER NOT NULL DEFAULT 1,
    "createdBy" UUID,
    "updatedBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LayoutTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LayoutRevision" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "contract" JSONB NOT NULL,
    "contractHash" TEXT NOT NULL,
    "validation" JSONB NOT NULL,
    "publishedBy" UUID,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LayoutRevision_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LayoutAssignment" (
    "id" UUID NOT NULL,
    "displayId" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'PREPARED',
    "compatibility" JSONB NOT NULL,
    "assignedBy" UUID,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "LayoutAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LayoutTemplate_state_mode_updatedAt_idx" ON "LayoutTemplate"("state", "mode", "updatedAt");
CREATE UNIQUE INDEX "LayoutRevision_templateId_revision_key" ON "LayoutRevision"("templateId", "revision");
CREATE UNIQUE INDEX "LayoutRevision_templateId_contractHash_key" ON "LayoutRevision"("templateId", "contractHash");
CREATE INDEX "LayoutRevision_publishedAt_idx" ON "LayoutRevision"("publishedAt");
CREATE INDEX "LayoutAssignment_displayId_state_assignedAt_idx" ON "LayoutAssignment"("displayId", "state", "assignedAt");
CREATE INDEX "LayoutAssignment_templateId_revisionId_idx" ON "LayoutAssignment"("templateId", "revisionId");
ALTER TABLE "LayoutRevision" ADD CONSTRAINT "LayoutRevision_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LayoutTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LayoutAssignment" ADD CONSTRAINT "LayoutAssignment_displayId_fkey" FOREIGN KEY ("displayId") REFERENCES "Display"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LayoutAssignment" ADD CONSTRAINT "LayoutAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LayoutTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LayoutAssignment" ADD CONSTRAINT "LayoutAssignment_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "LayoutRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WorkspaceBrand" (
    "id" UUID NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "market" TEXT NOT NULL DEFAULT '',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceBrand_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WorkspaceBrand_ownerEmail_updatedAt_idx" ON "WorkspaceBrand"("ownerEmail", "updatedAt");

CREATE TABLE "SavedAudience" (
    "id" UUID NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "locations" TEXT NOT NULL DEFAULT '',
    "ageRange" TEXT NOT NULL DEFAULT '',
    "interests" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedAudience_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SavedAudience_ownerEmail_updatedAt_idx" ON "SavedAudience"("ownerEmail", "updatedAt");

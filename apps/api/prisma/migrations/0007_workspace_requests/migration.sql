CREATE TABLE "WorkspaceSettings" (
    "id" UUID NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "workspaceName" TEXT NOT NULL,
    "workspaceType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkspaceSettings_ownerEmail_key" ON "WorkspaceSettings"("ownerEmail");

CREATE TABLE "TeamInvite" (
    "id" UUID NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "inviteEmail" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TeamInvite_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamInvite_ownerEmail_inviteEmail_key" ON "TeamInvite"("ownerEmail", "inviteEmail");
CREATE INDEX "TeamInvite_ownerEmail_status_createdAt_idx" ON "TeamInvite"("ownerEmail", "status", "createdAt");

CREATE TABLE "QuoteRequest" (
    "id" UUID NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "QuoteRequest_ownerEmail_status_createdAt_idx" ON "QuoteRequest"("ownerEmail", "status", "createdAt");

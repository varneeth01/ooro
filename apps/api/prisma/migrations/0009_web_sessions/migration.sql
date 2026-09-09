CREATE TABLE "WebSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebSession_tokenHash_key" ON "WebSession"("tokenHash");
CREATE INDEX "WebSession_ownerEmail_expiresAt_idx" ON "WebSession"("ownerEmail", "expiresAt");

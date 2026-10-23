-- Additive, non-destructive invitation storage. Existing user/driver auth unchanged.
CREATE TABLE "AdminInvitation" (
 "id" UUID NOT NULL,
 "email" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "role" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "acceptedAt" TIMESTAMP(3),
 "revokedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdById" UUID NOT NULL,
 CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminInvitation_tokenHash_key" ON "AdminInvitation"("tokenHash");
CREATE INDEX "AdminInvitation_email_createdAt_idx" ON "AdminInvitation"("email", "createdAt");
CREATE INDEX "AdminInvitation_expiresAt_idx" ON "AdminInvitation"("expiresAt");
ALTER TABLE "AdminInvitation" ADD CONSTRAINT "AdminInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

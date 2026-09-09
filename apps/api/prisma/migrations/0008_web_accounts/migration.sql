CREATE TABLE "WebAccount" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebAccount_email_key" ON "WebAccount"("email");

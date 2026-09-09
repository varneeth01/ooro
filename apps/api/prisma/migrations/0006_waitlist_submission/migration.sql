CREATE TABLE "WaitlistSubmission" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "company" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'direct',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WaitlistSubmission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WaitlistSubmission_email_city_key" ON "WaitlistSubmission"("email", "city");
CREATE INDEX "WaitlistSubmission_city_status_createdAt_idx" ON "WaitlistSubmission"("city", "status", "createdAt");

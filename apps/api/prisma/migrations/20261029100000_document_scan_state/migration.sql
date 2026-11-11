ALTER TABLE "KycDocument" ADD COLUMN "scanStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "DocumentUploadSession" ADD COLUMN "scanOutcome" TEXT;

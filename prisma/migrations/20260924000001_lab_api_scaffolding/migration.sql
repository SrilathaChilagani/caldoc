-- AlterTable: LabOrder — external dispatch tracking
ALTER TABLE "LabOrder" ADD COLUMN "externalOrderId" TEXT;
ALTER TABLE "LabOrder" ADD COLUMN "dispatchStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "LabOrder" ADD COLUMN "dispatchError" TEXT;
ALTER TABLE "LabOrder" ADD COLUMN "dispatchedAt" TIMESTAMP(3);

-- AlterTable: LabPartner — API integration config
ALTER TABLE "LabPartner" ADD COLUMN "apiType" TEXT;
ALTER TABLE "LabPartner" ADD COLUMN "apiBaseUrl" TEXT;
ALTER TABLE "LabPartner" ADD COLUMN "apiKeyEnvVar" TEXT;
ALTER TABLE "LabPartner" ADD COLUMN "apiSecretEnvVar" TEXT;
ALTER TABLE "LabPartner" ADD COLUMN "webhookSecret" TEXT;

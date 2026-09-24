-- AlterTable: RxOrder — external dispatch tracking
ALTER TABLE "RxOrder" ADD COLUMN "externalOrderId" TEXT;
ALTER TABLE "RxOrder" ADD COLUMN "dispatchStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "RxOrder" ADD COLUMN "dispatchError" TEXT;
ALTER TABLE "RxOrder" ADD COLUMN "dispatchedAt" TIMESTAMP(3);

-- AlterTable: PharmacyPartner — API integration config
ALTER TABLE "PharmacyPartner" ADD COLUMN "apiType" TEXT;
ALTER TABLE "PharmacyPartner" ADD COLUMN "apiBaseUrl" TEXT;
ALTER TABLE "PharmacyPartner" ADD COLUMN "apiKeyEnvVar" TEXT;
ALTER TABLE "PharmacyPartner" ADD COLUMN "apiSecretEnvVar" TEXT;
ALTER TABLE "PharmacyPartner" ADD COLUMN "webhookSecret" TEXT;

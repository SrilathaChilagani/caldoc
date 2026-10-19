-- Add scheduling fields to LabOrder
ALTER TABLE "LabOrder" ADD COLUMN "scheduledFor" TIMESTAMPTZ;
ALTER TABLE "LabOrder" ADD COLUMN "collectionType" TEXT;
ALTER TABLE "LabOrder" ADD COLUMN "scheduleNote" TEXT;

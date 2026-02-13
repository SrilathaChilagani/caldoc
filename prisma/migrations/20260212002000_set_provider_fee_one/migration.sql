-- Set default provider fee to ₹1 (100 paise) and normalize existing data
ALTER TABLE "Provider" ALTER COLUMN "defaultFeePaise" SET DEFAULT 100;

UPDATE "Provider"
SET "defaultFeePaise" = 100
WHERE "defaultFeePaise" IS DISTINCT FROM 100;

UPDATE "Slot"
SET "feePaise" = 100
WHERE "feePaise" IS NOT NULL AND "feePaise" IS DISTINCT FROM 100;

UPDATE "Appointment"
SET "feePaise" = 100
WHERE "feePaise" IS NOT NULL AND "feePaise" IS DISTINCT FROM 100;

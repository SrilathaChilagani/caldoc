-- Add optional fee column to slots so we can store custom fee per slot.
ALTER TABLE "Slot"
ADD COLUMN "feePaise" INTEGER;

-- Track the effective fee on appointments so downstream flows can bill accurately.
ALTER TABLE "Appointment"
ADD COLUMN "feePaise" INTEGER,
ADD COLUMN "feeCurrency" TEXT DEFAULT 'INR';

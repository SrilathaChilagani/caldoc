-- Add patientId to RxOrder for patient portal linkage
ALTER TABLE "RxOrder"
ADD COLUMN IF NOT EXISTS "patientId" TEXT;

ALTER TABLE "RxOrder"
ADD CONSTRAINT "RxOrder_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "RxOrder_patientId_idx" ON "RxOrder"("patientId");

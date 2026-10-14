-- Link RxOrder back to the Appointment that generated the prescription.
-- NULL = medicine order placed independently (e.g. refill, self-order).
ALTER TABLE "RxOrder" ADD COLUMN "appointmentId" TEXT;
ALTER TABLE "RxOrder"
  ADD CONSTRAINT "RxOrder_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL;
CREATE INDEX "RxOrder_appointmentId_idx" ON "RxOrder"("appointmentId");

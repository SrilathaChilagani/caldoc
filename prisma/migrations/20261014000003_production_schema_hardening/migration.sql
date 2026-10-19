-- Migration: 20261014000003_production_schema_hardening
-- Purpose: Production readiness — missing indexes, new audit fields,
--          new models (RefundRequest, ProviderScheduleTemplate), remove
--          legacy redundant field (Appointment.paymentId), add LabPartner
--          service areas for postal-code routing parity with PharmacyPartner.

-- ─────────────────────────────────────────────────────────────────
-- 1. AdminUser: add role field
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE "AdminUser" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'SUPER_ADMIN';

-- ─────────────────────────────────────────────────────────────────
-- 2. Provider: add audit/offboarding fields + timestamps
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE "Provider"
  ADD COLUMN "offboardedAt"      TIMESTAMP(3),
  ADD COLUMN "offboardedBy"      TEXT,
  ADD COLUMN "offboardingReason" TEXT,
  ADD COLUMN "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ─────────────────────────────────────────────────────────────────
-- 3. Appointment: drop legacy paymentId (redundant; Payment.appointmentId
--    is the authoritative FK; appointment.payment relation is the accessor)
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "paymentId";

-- ─────────────────────────────────────────────────────────────────
-- 4. LabPartner: add serviceAreas for postal-code routing
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE "LabPartner" ADD COLUMN "serviceAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ─────────────────────────────────────────────────────────────────
-- 5. Medication: drop redundant index (name has @unique which
--    already creates a B-tree index in Postgres)
-- ─────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS "Medication_name_idx";

-- ─────────────────────────────────────────────────────────────────
-- 6. New indexes on AuditLog
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_at_idx" ON "AuditLog"("actorId", "at");
CREATE INDEX IF NOT EXISTS "AuditLog_at_idx"         ON "AuditLog"("at");
CREATE INDEX IF NOT EXISTS "AuditLog_action_idx"     ON "AuditLog"("action");

-- ─────────────────────────────────────────────────────────────────
-- 7. New indexes on WebhookEvent
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "WebhookEvent_orderId_idx"     ON "WebhookEvent"("orderId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_source_type_idx" ON "WebhookEvent"("source", "type");

-- ─────────────────────────────────────────────────────────────────
-- 8. New indexes on PatientDocument
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "PatientDocument_patientId_idx" ON "PatientDocument"("patientId");

-- ─────────────────────────────────────────────────────────────────
-- 9. New index on PatientOtp
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "PatientOtp_patientId_idx" ON "PatientOtp"("patientId");

-- ─────────────────────────────────────────────────────────────────
-- 10. New indexes on OfflineRequest
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "OfflineRequest_status_createdAt_idx" ON "OfflineRequest"("status", "createdAt");

-- ─────────────────────────────────────────────────────────────────
-- 11. New index on PatientPasswordReset
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "PatientPasswordReset_patientId_idx" ON "PatientPasswordReset"("patientId");

-- ─────────────────────────────────────────────────────────────────
-- 12. New index on ProviderUser
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "ProviderUser_providerId_idx" ON "ProviderUser"("providerId");

-- ─────────────────────────────────────────────────────────────────
-- 13. New index on LabUser
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "LabUser_labPartnerId_idx" ON "LabUser"("labPartnerId");

-- ─────────────────────────────────────────────────────────────────
-- 14. New index on PharmacyUser
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "PharmacyUser_pharmacyPartnerId_idx" ON "PharmacyUser"("pharmacyPartnerId");

-- ─────────────────────────────────────────────────────────────────
-- 15. New composite index on LabOrder (patient portal queries)
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "LabOrder_patientId_status_idx" ON "LabOrder"("patientId", "status");

-- ─────────────────────────────────────────────────────────────────
-- 16. New table: RefundRequest
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE "RefundRequest" (
  "id"              TEXT         NOT NULL,
  "paymentId"       TEXT         NOT NULL,
  "amount"          INTEGER      NOT NULL,
  "reason"          TEXT         NOT NULL,
  "requestedBy"     TEXT         NOT NULL,
  "requestedByType" TEXT         NOT NULL,
  "status"          TEXT         NOT NULL DEFAULT 'PENDING',
  "gatewayRefundId" TEXT,
  "processedAt"     TIMESTAMP(3),
  "notes"           TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RefundRequest"
  ADD CONSTRAINT "RefundRequest_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "RefundRequest_paymentId_idx"       ON "RefundRequest"("paymentId");
CREATE INDEX "RefundRequest_status_createdAt_idx" ON "RefundRequest"("status", "createdAt");

-- ─────────────────────────────────────────────────────────────────
-- 17. New table: ProviderScheduleTemplate
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE "ProviderScheduleTemplate" (
  "id"                  TEXT         NOT NULL,
  "providerId"          TEXT         NOT NULL,
  "dayOfWeek"           INTEGER      NOT NULL,
  "startHour"           INTEGER      NOT NULL,
  "startMinute"         INTEGER      NOT NULL DEFAULT 0,
  "endHour"             INTEGER      NOT NULL,
  "endMinute"           INTEGER      NOT NULL DEFAULT 0,
  "slotDurationMinutes" INTEGER      NOT NULL DEFAULT 30,
  "isActive"            BOOLEAN      NOT NULL DEFAULT true,
  "effectiveFrom"       TIMESTAMP(3),
  "effectiveTo"         TIMESTAMP(3),
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProviderScheduleTemplate_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ProviderScheduleTemplate"
  ADD CONSTRAINT "ProviderScheduleTemplate_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ProviderScheduleTemplate_providerId_dayOfWeek_idx" ON "ProviderScheduleTemplate"("providerId", "dayOfWeek");
CREATE INDEX "ProviderScheduleTemplate_providerId_isActive_idx"  ON "ProviderScheduleTemplate"("providerId", "isActive");

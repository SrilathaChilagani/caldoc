-- Migration: 20261126000001_month3_compliance_esign_webhook
-- Month 3: DPDP compliance portal, digital prescription eSign stub, webhook retry reliability

-- ── Prescription: add eSign fields ───────────────────────────────────────────
ALTER TABLE "Prescription"
  ADD COLUMN "signatureStatus" TEXT,
  ADD COLUMN "signedAt"        TIMESTAMP(3),
  ADD COLUMN "signatureDocId"  TEXT;

-- ── WebhookEvent: add retry tracking fields ───────────────────────────────────
ALTER TABLE "WebhookEvent"
  ADD COLUMN "status"      TEXT NOT NULL DEFAULT 'PROCESSED',
  ADD COLUMN "retryCount"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextRetryAt" TIMESTAMP(3),
  ADD COLUMN "lastError"   TEXT;

CREATE INDEX "WebhookEvent_status_nextRetryAt_idx" ON "WebhookEvent"("status", "nextRetryAt");

-- ── DataSubjectRequest: DPDP data subject requests ───────────────────────────
CREATE TABLE "DataSubjectRequest" (
  "id"          TEXT NOT NULL,
  "patientId"   TEXT NOT NULL,
  "type"        TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "notes"       TEXT,
  "handledBy"   TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"  TIMESTAMP(3),
  CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataSubjectRequest_patientId_idx"   ON "DataSubjectRequest"("patientId");
CREATE INDEX "DataSubjectRequest_status_idx"       ON "DataSubjectRequest"("status");
CREATE INDEX "DataSubjectRequest_requestedAt_idx"  ON "DataSubjectRequest"("requestedAt");

ALTER TABLE "DataSubjectRequest"
  ADD CONSTRAINT "DataSubjectRequest_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE;

-- ── BreachNotification: DPDP breach notification log ─────────────────────────
CREATE TABLE "BreachNotification" (
  "id"            TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "description"   TEXT NOT NULL,
  "severity"      TEXT NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'DETECTED',
  "affectedCount" INTEGER,
  "discoveredAt"  TIMESTAMP(3) NOT NULL,
  "containedAt"   TIMESTAMP(3),
  "resolvedAt"    TIMESTAMP(3),
  "reportedAt"    TIMESTAMP(3),
  "createdBy"     TEXT NOT NULL,
  "notes"         TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BreachNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BreachNotification_status_idx"   ON "BreachNotification"("status");
CREATE INDEX "BreachNotification_severity_idx" ON "BreachNotification"("severity");

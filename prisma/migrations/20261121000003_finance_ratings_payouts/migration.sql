-- Migration: 20261121000003_finance_ratings_payouts
-- Adds: Finance fields on Provider & Payment, AppointmentRating,
--       InvoiceSequence, ProviderPayout, PayoutBatch, TdsLedger

-- Provider: commission, bank details, payout identifiers
ALTER TABLE "Provider"
  ADD COLUMN "commissionPct"         INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "bankAccountName"       TEXT,
  ADD COLUMN "bankAccountNumber"     TEXT,
  ADD COLUMN "bankIfscCode"          TEXT,
  ADD COLUMN "razorpayContactId"     TEXT,
  ADD COLUMN "razorpayFundAccountId" TEXT,
  ADD COLUMN "panNumber"             TEXT;

-- Payment: GST invoice number + tax split (paise)
ALTER TABLE "Payment"
  ADD COLUMN "gstInvoiceNumber" TEXT,
  ADD COLUMN "cgstPaise"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sgstPaise"        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "igstPaise"        INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Payment_gstInvoiceNumber_idx" ON "Payment"("gstInvoiceNumber");

-- InvoiceSequence: auto-incrementing GST invoice counter per month
CREATE TABLE "InvoiceSequence" (
  "id"      TEXT NOT NULL,
  "year"    INTEGER NOT NULL,
  "month"   INTEGER NOT NULL,
  "counter" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InvoiceSequence_year_month_key" ON "InvoiceSequence"("year", "month");

-- AppointmentRating: post-consult patient rating (1-5)
CREATE TABLE "AppointmentRating" (
  "id"            TEXT NOT NULL,
  "appointmentId" TEXT NOT NULL,
  "patientId"     TEXT NOT NULL,
  "providerId"    TEXT NOT NULL,
  "rating"        INTEGER NOT NULL,
  "comment"       TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppointmentRating_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AppointmentRating_appointmentId_key" ON "AppointmentRating"("appointmentId");
CREATE INDEX "AppointmentRating_providerId_idx" ON "AppointmentRating"("providerId");
CREATE INDEX "AppointmentRating_patientId_idx"  ON "AppointmentRating"("patientId");

ALTER TABLE "AppointmentRating"
  ADD CONSTRAINT "AppointmentRating_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "AppointmentRating_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "AppointmentRating_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT;

-- PayoutBatch: grouped payout runs
CREATE TABLE "PayoutBatch" (
  "id"              TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'DRAFT',
  "totalGrossPaise" INTEGER NOT NULL DEFAULT 0,
  "totalTdsPaise"   INTEGER NOT NULL DEFAULT 0,
  "totalNetPaise"   INTEGER NOT NULL DEFAULT 0,
  "note"            TEXT,
  "createdBy"       TEXT NOT NULL,
  "processedAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PayoutBatch_status_idx"    ON "PayoutBatch"("status");
CREATE INDEX "PayoutBatch_createdAt_idx" ON "PayoutBatch"("createdAt");

ALTER TABLE "PayoutBatch"
  ADD CONSTRAINT "PayoutBatch_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "AdminUser"("id");

-- ProviderPayout: per-appointment payout record
CREATE TABLE "ProviderPayout" (
  "id"               TEXT NOT NULL,
  "providerId"       TEXT NOT NULL,
  "appointmentId"    TEXT NOT NULL,
  "consultAmtPaise"  INTEGER NOT NULL,
  "commissionPaise"  INTEGER NOT NULL,
  "grossPayoutPaise" INTEGER NOT NULL,
  "tdsDeductPaise"   INTEGER NOT NULL DEFAULT 0,
  "netPayoutPaise"   INTEGER NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'PENDING',
  "razorpayPayoutId" TEXT,
  "paidAt"           TIMESTAMP(3),
  "failureReason"    TEXT,
  "payoutBatchId"    TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderPayout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProviderPayout_appointmentId_key" ON "ProviderPayout"("appointmentId");
CREATE INDEX "ProviderPayout_providerId_status_idx" ON "ProviderPayout"("providerId", "status");
CREATE INDEX "ProviderPayout_status_idx"             ON "ProviderPayout"("status");
CREATE INDEX "ProviderPayout_payoutBatchId_idx"      ON "ProviderPayout"("payoutBatchId");

ALTER TABLE "ProviderPayout"
  ADD CONSTRAINT "ProviderPayout_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id"),
  ADD CONSTRAINT "ProviderPayout_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id"),
  ADD CONSTRAINT "ProviderPayout_payoutBatchId_fkey"
    FOREIGN KEY ("payoutBatchId") REFERENCES "PayoutBatch"("id");

-- TdsLedger: cumulative TDS per provider per financial year
CREATE TABLE "TdsLedger" (
  "id"            TEXT NOT NULL,
  "providerId"    TEXT NOT NULL,
  "financialYear" TEXT NOT NULL,
  "grossPaidPaise" INTEGER NOT NULL DEFAULT 0,
  "tdsDeducted"   INTEGER NOT NULL DEFAULT 0,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TdsLedger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TdsLedger_providerId_financialYear_key" ON "TdsLedger"("providerId", "financialYear");
CREATE INDEX "TdsLedger_providerId_idx" ON "TdsLedger"("providerId");

ALTER TABLE "TdsLedger"
  ADD CONSTRAINT "TdsLedger_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id");

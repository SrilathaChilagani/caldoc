-- CreateTable
CREATE TABLE "FollowUpRequest" (
    "id"            TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId"     TEXT NOT NULL,
    "providerId"    TEXT NOT NULL,
    "labOrderId"    TEXT,
    "type"          TEXT NOT NULL,
    "daysUntilDue"  INTEGER,
    "status"        TEXT NOT NULL DEFAULT 'PENDING',
    "dueAt"         TIMESTAMPTZ,
    "providerNote"  TEXT,
    "notifiedAt"    TIMESTAMPTZ,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMPTZ NOT NULL,

    CONSTRAINT "FollowUpRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpRequest_patientId_status_idx" ON "FollowUpRequest"("patientId", "status");
CREATE INDEX "FollowUpRequest_status_dueAt_idx" ON "FollowUpRequest"("status", "dueAt");
CREATE INDEX "FollowUpRequest_appointmentId_idx" ON "FollowUpRequest"("appointmentId");

-- AddForeignKey
ALTER TABLE "FollowUpRequest" ADD CONSTRAINT "FollowUpRequest_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FollowUpRequest" ADD CONSTRAINT "FollowUpRequest_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FollowUpRequest" ADD CONSTRAINT "FollowUpRequest_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FollowUpRequest" ADD CONSTRAINT "FollowUpRequest_labOrderId_fkey"
    FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

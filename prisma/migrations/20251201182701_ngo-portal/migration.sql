-- CreateTable
CREATE TABLE "Ngo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "billingNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ngo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NgoUser" (
    "id" TEXT NOT NULL,
    "ngoId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NgoUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NgoReservation" (
    "id" TEXT NOT NULL,
    "ngoId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "slotId" TEXT,
    "appointmentId" TEXT,
    "friendlyId" TEXT NOT NULL,
    "speciality" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "amountPaise" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    CONSTRAINT "NgoReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ngo_slug_key" ON "Ngo"("slug");
CREATE INDEX "Ngo_slug_idx" ON "Ngo"("slug");
CREATE UNIQUE INDEX "NgoUser_email_key" ON "NgoUser"("email");
CREATE UNIQUE INDEX "NgoReservation_friendlyId_key" ON "NgoReservation"("friendlyId");
CREATE UNIQUE INDEX "NgoReservation_appointmentId_key" ON "NgoReservation"("appointmentId");
CREATE INDEX "NgoReservation_ngoId_status_idx" ON "NgoReservation"("ngoId", "status");
CREATE INDEX "NgoReservation_providerId_status_idx" ON "NgoReservation"("providerId", "status");

-- Foreign keys
ALTER TABLE "NgoUser"
  ADD CONSTRAINT "NgoUser_ngoId_fkey"
  FOREIGN KEY ("ngoId") REFERENCES "Ngo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NgoReservation"
  ADD CONSTRAINT "NgoReservation_ngoId_fkey"
  FOREIGN KEY ("ngoId") REFERENCES "Ngo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NgoReservation"
  ADD CONSTRAINT "NgoReservation_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "NgoReservation"
  ADD CONSTRAINT "NgoReservation_slotId_fkey"
  FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NgoReservation"
  ADD CONSTRAINT "NgoReservation_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

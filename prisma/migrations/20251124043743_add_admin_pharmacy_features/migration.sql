-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "deliveryAddressId" TEXT,
ADD COLUMN     "deliveryAddressSnapshot" JSONB,
ADD COLUMN     "uploadLinkSentAt" TIMESTAMP(3),
ADD COLUMN     "visitMode" TEXT NOT NULL DEFAULT 'VIDEO';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "profilePhotoKey" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "receiptUrl" TEXT;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "licenseDocKey" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profilePhotoKey" TEXT,
ADD COLUMN     "registrationDocKey" TEXT;

-- CreateTable
CREATE TABLE "PatientAddress" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "label" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "instructions" TEXT,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "PatientAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientDocument" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientOtp" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "phoneRaw" TEXT NOT NULL,
    "phoneCanonical" TEXT NOT NULL,
    "last10" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PatientOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyFulfillment" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "speciality" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "OfflineRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientAddress_patientId_idx" ON "PatientAddress"("patientId");

-- CreateIndex
CREATE INDEX "PatientAddress_contactPhone_idx" ON "PatientAddress"("contactPhone");

-- CreateIndex
CREATE INDEX "PatientDocument_appointmentId_idx" ON "PatientDocument"("appointmentId");

-- CreateIndex
CREATE INDEX "PatientOtp_phoneCanonical_idx" ON "PatientOtp"("phoneCanonical");

-- CreateIndex
CREATE INDEX "PatientOtp_last10_idx" ON "PatientOtp"("last10");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyFulfillment_appointmentId_key" ON "PharmacyFulfillment"("appointmentId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "PatientAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAddress" ADD CONSTRAINT "PatientAddress_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientOtp" ADD CONSTRAINT "PatientOtp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyFulfillment" ADD CONSTRAINT "PharmacyFulfillment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

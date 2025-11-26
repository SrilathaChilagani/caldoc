-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "consentMode" TEXT,
ADD COLUMN     "consentText" TEXT,
ADD COLUMN     "consentType" TEXT;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "councilName" TEXT,
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "registrationNumber" TEXT;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

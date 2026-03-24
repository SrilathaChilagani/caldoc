-- AlterTable
ALTER TABLE "Patient" ADD COLUMN "passwordHash" TEXT;

-- CreateTable
CREATE TABLE "PatientPasswordReset" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PatientPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientPasswordReset_token_key" ON "PatientPasswordReset"("token");

-- AddForeignKey
ALTER TABLE "PatientPasswordReset" ADD CONSTRAINT "PatientPasswordReset_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

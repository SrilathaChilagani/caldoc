-- CreateTable
CREATE TABLE "FrontDeskUserClinic" (
    "id" TEXT NOT NULL,
    "frontDeskUserId" TEXT NOT NULL,
    "providerClinicId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrontDeskUserClinic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FrontDeskUserClinic_frontDeskUserId_providerClinicId_key" ON "FrontDeskUserClinic"("frontDeskUserId", "providerClinicId");

-- CreateIndex
CREATE INDEX "FrontDeskUserClinic_frontDeskUserId_idx" ON "FrontDeskUserClinic"("frontDeskUserId");

-- CreateIndex
CREATE INDEX "FrontDeskUserClinic_providerClinicId_idx" ON "FrontDeskUserClinic"("providerClinicId");

-- AddForeignKey
ALTER TABLE "FrontDeskUserClinic" ADD CONSTRAINT "FrontDeskUserClinic_frontDeskUserId_fkey" FOREIGN KEY ("frontDeskUserId") REFERENCES "FrontDeskUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrontDeskUserClinic" ADD CONSTRAINT "FrontDeskUserClinic_providerClinicId_fkey" FOREIGN KEY ("providerClinicId") REFERENCES "ProviderClinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

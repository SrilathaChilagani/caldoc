/*
  Warnings:

  - A unique constraint covering the columns `[providerId,startsAt]` on the table `Slot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Slot_providerId_startsAt_key" ON "Slot"("providerId", "startsAt");

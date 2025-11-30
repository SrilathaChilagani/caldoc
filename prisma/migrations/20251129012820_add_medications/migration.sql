-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "generic" TEXT,
    "form" TEXT,
    "strength" TEXT,
    "category" TEXT DEFAULT 'OTC',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Medication_name_key" ON "Medication"("name");
CREATE INDEX "Medication_name_idx" ON "Medication"("name");

/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Provider` will be added. If there are existing duplicate values, this will fail.
  - Made the column `slug` on table `Provider` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Provider" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

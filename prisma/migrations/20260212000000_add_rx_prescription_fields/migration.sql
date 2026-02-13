-- Add Rx prescription metadata fields
ALTER TABLE "RxOrder"
ADD COLUMN IF NOT EXISTS "rxDocumentKey" TEXT,
ADD COLUMN IF NOT EXISTS "rxDocumentName" TEXT,
ADD COLUMN IF NOT EXISTS "rxDocumentType" TEXT,
ADD COLUMN IF NOT EXISTS "rxDocumentSize" INTEGER,
ADD COLUMN IF NOT EXISTS "rxDocumentUploadedAt" TIMESTAMP(3);

-- Add quote orchestration fields to RxOrder
ALTER TABLE "RxOrder"
  ADD COLUMN "quotedAmountPaise" INTEGER,
  ADD COLUMN "quoteNote"         TEXT,
  ADD COLUMN "quoteExpiresAt"    TIMESTAMP(3);

-- New RxOrderItem table for per-item quote tracking
CREATE TABLE "RxOrderItem" (
  "id"                TEXT NOT NULL,
  "rxOrderId"         TEXT NOT NULL,
  "name"              TEXT NOT NULL,
  "sig"               TEXT,
  "qtyPrescribed"     TEXT,
  "status"            TEXT NOT NULL DEFAULT 'PENDING',
  "dispensedName"     TEXT,
  "dispensedSig"      TEXT,
  "unitPricePaise"    INTEGER,
  "qtyDispensed"      INTEGER,
  "substituteApproved" BOOLEAN,
  "note"              TEXT,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RxOrderItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RxOrderItem"
  ADD CONSTRAINT "RxOrderItem_rxOrderId_fkey"
  FOREIGN KEY ("rxOrderId") REFERENCES "RxOrder"("id") ON DELETE CASCADE;

CREATE INDEX "RxOrderItem_rxOrderId_idx" ON "RxOrderItem"("rxOrderId");

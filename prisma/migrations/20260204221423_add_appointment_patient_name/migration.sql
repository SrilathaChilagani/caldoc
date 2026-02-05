ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "patientName" TEXT;

ALTER TABLE "OutboundMessage" ADD COLUMN IF NOT EXISTS "messageId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "OutboundMessage_messageId_key" ON "OutboundMessage"("messageId");

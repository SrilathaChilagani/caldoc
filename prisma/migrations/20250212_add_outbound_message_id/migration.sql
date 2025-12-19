ALTER TABLE "OutboundMessage" ADD COLUMN "messageId" TEXT;
CREATE UNIQUE INDEX "OutboundMessage_messageId_key" ON "OutboundMessage"("messageId");

-- AlterTable
ALTER TABLE "OutboundMessage" ADD COLUMN     "kind" TEXT;

-- CreateIndex
CREATE INDEX "OutboundMessage_appointmentId_template_status_idx" ON "OutboundMessage"("appointmentId", "template", "status");

-- CreateIndex
CREATE INDEX "OutboundMessage_appointmentId_kind_status_idx" ON "OutboundMessage"("appointmentId", "kind", "status");

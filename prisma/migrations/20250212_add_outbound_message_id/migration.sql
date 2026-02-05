DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'OutboundMessage'
    ) THEN
        ALTER TABLE "OutboundMessage" ADD COLUMN IF NOT EXISTS "messageId" TEXT;
        CREATE UNIQUE INDEX IF NOT EXISTS "OutboundMessage_messageId_key" ON "OutboundMessage"("messageId");
    END IF;
END $$;

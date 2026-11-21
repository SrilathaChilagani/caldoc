-- Migration: 20261121000004_admin_totp
-- Adds TOTP 2FA fields to AdminUser

ALTER TABLE "AdminUser"
  ADD COLUMN "totpSecret"  TEXT,
  ADD COLUMN "totpEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

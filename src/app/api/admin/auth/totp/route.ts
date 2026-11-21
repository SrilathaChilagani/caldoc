/**
 * TOTP 2FA management for admin users.
 *
 * GET  — return current 2FA status (enabled yes/no)
 * POST with action=SETUP    — generate secret + QR code (not yet enabled)
 * POST with action=VERIFY   — verify first code, enable TOTP
 * POST with action=DISABLE  — disable TOTP (requires password confirmation)
 */
import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

const APP_NAME = "CalDoc Admin";

export async function GET(_req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.adminUser.findUnique({
    where: { id: sess.userId },
    select: { id: true, email: true, totpEnabled: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ totpEnabled: user.totpEnabled });
}

export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, code, password } = await req.json() as {
    action: "SETUP" | "VERIFY" | "DISABLE";
    code?: string;
    password?: string;
  };

  const user = await prisma.adminUser.findUnique({ where: { id: sess.userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // ── SETUP: generate secret + QR code (not yet saved as enabled) ──────────
  if (action === "SETUP") {
    const secret = speakeasy.generateSecret({ length: 32, name: `${APP_NAME}:${user.email}` });

    // Store secret (temp) even if not yet verified, so VERIFY can read it
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { totpSecret: secret.base32, totpEnabled: false },
    });

    const otpauthUrl = secret.otpauth_url!;
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return NextResponse.json({ qrCode: qrCodeDataUrl, secret: secret.base32, otpauthUrl });
  }

  // ── VERIFY: validate first code and enable TOTP ───────────────────────────
  if (action === "VERIFY") {
    if (!code) return NextResponse.json({ error: "code is required" }, { status: 400 });
    if (!user.totpSecret) return NextResponse.json({ error: "TOTP setup not initiated" }, { status: 400 });

    const valid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: "base32",
      token: code.replace(/\s/g, ""),
      window: 1,
    });

    if (!valid) return NextResponse.json({ error: "Invalid code — please try again" }, { status: 400 });

    await prisma.adminUser.update({ where: { id: user.id }, data: { totpEnabled: true } });
    return NextResponse.json({ ok: true, totpEnabled: true });
  }

  // ── DISABLE: verify password + current TOTP code, then disable ───────────
  if (action === "DISABLE") {
    if (!password) return NextResponse.json({ error: "password is required to disable 2FA" }, { status: 400 });

    const pwOk = await bcrypt.compare(password, user.passwordHash);
    if (!pwOk) return NextResponse.json({ error: "Incorrect password" }, { status: 403 });

    if (user.totpEnabled && code) {
      const valid = speakeasy.totp.verify({
        secret: user.totpSecret!,
        encoding: "base32",
        token: code.replace(/\s/g, ""),
        window: 1,
      });
      if (!valid) return NextResponse.json({ error: "Invalid TOTP code" }, { status: 400 });
    }

    await prisma.adminUser.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
    return NextResponse.json({ ok: true, totpEnabled: false });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

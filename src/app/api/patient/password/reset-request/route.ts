import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({
      where: { email },
      select: { id: true, name: true },
    });

    // Always return success to prevent email enumeration
    if (!patient) {
      return NextResponse.json({ ok: true });
    }

    // Invalidate existing tokens for this patient
    await prisma.patientPasswordReset.updateMany({
      where: { patientId: patient.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.patientPasswordReset.create({
      data: { patientId: patient.id, token, expiresAt },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_BASE || "https://www.caldoc.in";
    const resetLink = `${appUrl}/patient/reset-password?token=${token}`;

    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || "CalDoc <noreply@caldoc.in>";

    if (resendKey && !resendKey.includes("xxx")) {
      const html = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
          <h2 style="color:#2f6ea5">Reset your CalDoc password</h2>
          <p>Hi ${patient.name},</p>
          <p>We received a request to reset your password. Click the button below to set a new password. This link expires in 1 hour.</p>
          <p style="margin:32px 0">
            <a href="${resetLink}" style="background:#2f6ea5;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
              Reset Password
            </a>
          </p>
          <p style="color:#64748b;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="color:#94a3b8;font-size:12px">CalDoc Telemedicine · caldoc.in</p>
        </div>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [email],
          subject: "Reset your CalDoc password",
          html,
        }),
      }).catch((err) => console.error("[password-reset] email failed:", err));
    } else {
      console.log("[password-reset] Reset link (email not configured):", resetLink);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[password-reset/request]", err);
    return NextResponse.json({ error: "Failed. Please try again." }, { status: 500 });
  }
}

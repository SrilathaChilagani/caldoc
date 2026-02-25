import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import { sendWhatsAppText } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

function appBaseUrl() {
  return process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://caldoc.in";
}

/** Convert a name to a URL-safe slug */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/dr\.?\s*/gi, "dr-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/** 8-char memorable temp password: Caldoc@ + 4 digits */
function generateTempPassword(): string {
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  return `Caldoc@${digits}`;
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (true) {
    const existing = await prisma.provider.findUnique({ where: { slug } });
    if (!existing) return slug;
    attempt++;
    slug = `${base}-${attempt}`;
  }
}

/** Send email via Resend if RESEND_API_KEY is configured */
async function sendProviderWelcomeEmail(opts: {
  to: string;
  name: string;
  tempPassword: string;
  portalUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "CalDoc <noreply@caldoc.in>";
  if (!apiKey) return; // Email not configured

  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
      <div style="background:#2f6ea5;padding:24px 32px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">Welcome to CalDoc!</h1>
      </div>
      <div style="background:#f8fafc;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0">
        <p>Dear <strong>${opts.name}</strong>,</p>
        <p>Congratulations! Your application to join CalDoc as a provider has been <strong>reviewed and approved</strong>.</p>
        <p>Here are your provider portal credentials:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr>
            <td style="padding:8px 12px;background:#f1f5f9;font-weight:600;border-radius:8px 0 0 0">Portal</td>
            <td style="padding:8px 12px;border-radius:0 8px 0 0"><a href="${opts.portalUrl}" style="color:#2f6ea5">${opts.portalUrl}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 12px;background:#f1f5f9;font-weight:600">Email</td>
            <td style="padding:8px 12px">${opts.to}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;background:#f1f5f9;font-weight:600;border-radius:0 0 0 8px">Temp Password</td>
            <td style="padding:8px 12px;font-family:monospace;font-size:16px;border-radius:0 0 8px 0"><strong>${opts.tempPassword}</strong></td>
          </tr>
        </table>
        <p style="color:#dc2626;font-size:13px">⚠️ Please log in and change your password immediately after your first login.</p>
        <h3 style="color:#2f6ea5">Getting started:</h3>
        <ol style="color:#475569;font-size:14px;line-height:1.8">
          <li>Log in at <a href="${opts.portalUrl}" style="color:#2f6ea5">${opts.portalUrl}</a></li>
          <li>Change your temporary password from Settings</li>
          <li>Go to <strong>Manage Slots</strong> to set your availability</li>
          <li>Patients will be able to book appointments once you have active slots</li>
        </ol>
        <p style="margin-top:24px;font-size:13px;color:#94a3b8">
          Need help? WhatsApp us at ${process.env.ADMIN_PHONE || "our support number"}.
        </p>
        <p style="margin-top:8px;color:#475569">Warm regards,<br/><strong>CalDoc Team</strong></p>
      </div>
    </div>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: "Welcome to CalDoc — Your Provider Portal Access",
        html,
      }),
    });
  } catch (err) {
    console.error("[enroll/approve] email send failed:", err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const sess = await requireAdminSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const adminEmail = (body?.adminEmail as string) || "admin";

  const enrollment = await prisma.providerEnrollment.findUnique({ where: { id } });
  if (!enrollment) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  if (enrollment.status !== "PENDING") {
    return NextResponse.json({ error: "Enrollment is not in PENDING status" }, { status: 409 });
  }

  // Generate credentials
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const baseSlug = slugify(enrollment.fullName);
  const slug = await ensureUniqueSlug(baseSlug);

  // Create Provider + ProviderUser in a transaction
  const { provider } = await prisma.$transaction(async (tx) => {
    const provider = await tx.provider.create({
      data: {
        name: enrollment.fullName,
        speciality: enrollment.speciality,
        languages: enrollment.languages,
        licenseNo: enrollment.registrationNumber,
        registrationNumber: enrollment.registrationNumber,
        councilName: enrollment.registrationCouncil,
        qualification: enrollment.qualification,
        slug,
        phone: enrollment.phone,
        isActive: true,
        defaultFeePaise: enrollment.feePaise ?? 50000,
        profilePhotoKey: enrollment.profilePhotoKey ?? undefined,
        registrationDocKey: enrollment.registrationDocKey ?? undefined,
      },
    });

    await tx.providerUser.create({
      data: {
        providerId: provider.id,
        email: enrollment.email,
        passwordHash,
        role: "provider",
      },
    });

    await tx.providerEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByEmail: adminEmail,
        providerId: provider.id,
      },
    });

    return { provider };
  });

  const portalUrl = `${appBaseUrl()}/provider/login`;

  // Notify provider via WhatsApp
  if (enrollment.phone) {
    try {
      const msg = [
        `🎉 Congratulations ${enrollment.fullName.split(" ")[0]}!`,
        `Your CalDoc provider application has been approved.`,
        ``,
        `Your portal credentials:`,
        `🌐 Login: ${portalUrl}`,
        `📧 Email: ${enrollment.email}`,
        `🔑 Temp password: ${tempPassword}`,
        ``,
        `Please log in and change your password. Then go to Manage Slots to set your availability so patients can book appointments with you.`,
      ].join("\n");
      await sendWhatsAppText(enrollment.phone, msg);
    } catch (waErr) {
      console.error("[enroll/approve] provider WA failed:", waErr);
    }
  }

  // Send welcome email
  await sendProviderWelcomeEmail({
    to: enrollment.email,
    name: enrollment.fullName,
    tempPassword,
    portalUrl,
  });

  return NextResponse.json({
    ok: true,
    providerId: provider.id,
    tempPassword,
  });
}

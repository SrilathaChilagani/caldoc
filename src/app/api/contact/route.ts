import { NextResponse } from "next/server";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { getErrorMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim().slice(0, 100);
    const email = String(body?.email || "").trim().slice(0, 200);
    const phone = String(body?.phone || "").trim().slice(0, 20);
    const message = String(body?.message || "").trim().slice(0, 2000);

    if (!name || !message) {
      return NextResponse.json({ error: "Name and message are required" }, { status: 400 });
    }

    const adminPhone = process.env.ADMIN_PHONE;
    const resendKey = process.env.RESEND_API_KEY;
    const contactEmail = process.env.CONTACT_FORM_EMAIL || process.env.EMAIL_FROM || "support@caldoc.in";

    // Notify admin via WhatsApp
    if (adminPhone) {
      const waMsg = [
        `📬 New contact form submission`,
        `Name: ${name}`,
        phone ? `Phone: ${phone}` : null,
        email ? `Email: ${email}` : null,
        `Message: ${message}`,
      ]
        .filter(Boolean)
        .join("\n");
      await sendWhatsAppText(adminPhone, waMsg).catch((err) =>
        console.error("[contact] WA notify failed:", err)
      );
    }

    // Send email via Resend
    if (resendKey) {
      const html = `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
          <h2 style="color:#2f6ea5">New Contact Form Submission</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:6px 0;font-weight:600;width:80px">Name</td><td>${escapeHtml(name)}</td></tr>
            ${phone ? `<tr><td style="padding:6px 0;font-weight:600">Phone</td><td>${escapeHtml(phone)}</td></tr>` : ""}
            ${email ? `<tr><td style="padding:6px 0;font-weight:600">Email</td><td>${escapeHtml(email)}</td></tr>` : ""}
            <tr><td style="padding:6px 0;font-weight:600;vertical-align:top">Message</td><td style="white-space:pre-wrap">${escapeHtml(message)}</td></tr>
          </table>
        </div>`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "CalDoc <noreply@caldoc.in>",
          to: [contactEmail],
          reply_to: email || undefined,
          subject: `Contact form: ${name}`,
          html,
        }),
      }).catch((err) => console.error("[contact] email failed:", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readPatientPhone } from "@/lib/patientAuth.server";
import { readProviderSession, readAdminSession } from "@/lib/auth.server";

type RouteCtx = {
  params: Promise<{ orderId: string }>;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


export async function GET(req: NextRequest, { params }: RouteCtx) {
  try {
    const { orderId } = await params;
    const download = req.nextUrl.searchParams.get("download") === "1";
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: {
        appointment: {
          include: {
            patient: true,
            provider: true,
            slot: { select: { startsAt: true } },
          },
        },
      },
    });

    if (!payment || !payment.appointment) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    // ── Auth check ───────────────────────────────────────────────────────
    // Allow: admin, the provider for this appointment, or the patient who paid.
    const [patientPhone, providerSess, adminSess] = await Promise.all([
      readPatientPhone(),
      readProviderSession(),
      readAdminSession(),
    ]);

    const apptPatientPhone = payment.appointment.patient?.phone;
    const apptProviderId = payment.appointment.providerId;

    const isPatient = !!patientPhone && patientPhone === apptPatientPhone;
    const isProvider = !!providerSess && providerSess.pid === apptProviderId;
    const isAdmin = !!adminSess;

    if (!isPatient && !isProvider && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appt = payment.appointment;
    const when = appt.slot?.startsAt ? new Date(appt.slot.startsAt) : appt.createdAt;
    const whenText = new Date(when).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const downloadHref = `/api/payments/${encodeURIComponent(orderId)}/receipt?download=1`;

    const html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>CalDoc Receipt</title>
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif; background:#f7f9fc; padding:24px; }
          .card { background:#fff; border-radius:24px; padding:24px; max-width:640px; margin:0 auto; box-shadow:0 10px 35px rgba(15,23,42,0.08); }
          h1 { margin-top:0; font-size:24px; color:#0f172a; }
          .row { margin:8px 0; font-size:14px; color:#334155; }
          .label { font-weight:600; color:#0f172a; }
          .actions { max-width:640px; margin:0 auto 12px; display:flex; gap:10px; justify-content:flex-end; }
          .btn { border:1px solid #cbd5e1; background:#fff; color:#0f172a; padding:8px 12px; border-radius:999px; font-size:14px; font-weight:600; cursor:pointer; text-decoration:none; }
          .btn.primary { background:#0f172a; border-color:#0f172a; color:#fff; }
          @media print {
            body { padding:0; background:#fff; }
            .actions { display:none !important; }
            .card { box-shadow:none; border-radius:0; max-width:none; }
          }
        </style>
      </head>
      <body>
        <div class="actions">
          <a class="btn" href="${downloadHref}">Download</a>
          <button class="btn primary" type="button" onclick="window.print()">Print</button>
        </div>
        <div class="card">
          <h1>CalDoc Receipt</h1>
          <div class="row"><span class="label">Order ID:</span> ${escapeHtml(payment.orderId)}</div>
          <div class="row"><span class="label">Appointment:</span> ${escapeHtml(appt.id)}</div>
          <div class="row"><span class="label">Amount:</span> ₹${(payment.amount / 100).toFixed(2)}</div>
          <div class="row"><span class="label">Status:</span> ${escapeHtml(payment.status)}</div>
          <div class="row"><span class="label">Provider:</span> ${escapeHtml(appt.provider?.name ?? "—")}</div>
          <div class="row"><span class="label">Patient:</span> ${escapeHtml(appt.patientName || appt.patient?.name || "—")}</div>
          <div class="row"><span class="label">Scheduled:</span> ${escapeHtml(whenText)} IST</div>
          <div class="row"><span class="label">Generated:</span> ${escapeHtml(new Date(payment.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))}</div>
        </div>
      </body>
      </html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        ...(download
          ? { "Content-Disposition": `attachment; filename="caldoc-receipt-${payment.orderId}.html"` }
          : {}),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

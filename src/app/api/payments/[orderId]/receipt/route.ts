import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteCtx = {
  params: Promise<{ orderId: string }>;
};

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  try {
    const { orderId } = await params;
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
        </style>
      </head>
      <body>
        <div class="card">
          <h1>CalDoc Receipt</h1>
          <div class="row"><span class="label">Order ID:</span> ${payment.orderId}</div>
          <div class="row"><span class="label">Appointment:</span> ${appt.id}</div>
          <div class="row"><span class="label">Amount:</span> ₹${(payment.amount / 100).toFixed(2)}</div>
          <div class="row"><span class="label">Status:</span> ${payment.status}</div>
          <div class="row"><span class="label">Provider:</span> ${appt.provider?.name ?? "—"}</div>
          <div class="row"><span class="label">Patient:</span> ${appt.patientName || appt.patient?.name || "—"}</div>
          <div class="row"><span class="label">Scheduled:</span> ${whenText} IST</div>
          <div class="row"><span class="label">Generated:</span> ${new Date(payment.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</div>
        </div>
      </body>
      </html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

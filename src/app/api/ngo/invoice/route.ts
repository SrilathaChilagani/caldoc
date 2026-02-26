import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireNgoSession } from "@/lib/auth.server";

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatIST(date: Date) {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatINR(paise: number | null | undefined) {
  if (!paise) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

export async function GET(req: NextRequest) {
  const sess = await requireNgoSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const download = searchParams.get("download") === "1";

  const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  let endDate = end ? new Date(end) : new Date();
  // ensure end covers the full day
  endDate.setHours(23, 59, 59, 999);

  const [ngo, reservations] = await Promise.all([
    prisma.ngo.findUnique({ where: { id: sess.ngoId }, select: { name: true, slug: true } }),
    prisma.ngoReservation.findMany({
      where: {
        ngoId: sess.ngoId,
        status: { not: "CANCELLED" },
        slot: { startsAt: { gte: startDate, lte: endDate } },
      },
      orderBy: { createdAt: "asc" },
      include: {
        provider: { select: { name: true, speciality: true } },
        slot: { select: { startsAt: true } },
        appointment: { select: { id: true, status: true, patientName: true } },
      },
    }),
  ]);

  const totalPaise = reservations.reduce((sum, r) => sum + (r.amountPaise ?? 0), 0);
  const confirmedCount = reservations.filter((r) => r.appointment?.status === "CONFIRMED").length;

  const rows = reservations
    .map(
      (r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(r.friendlyId)}</td>
      <td>${escapeHtml(r.appointment?.patientName || "—")}</td>
      <td>${escapeHtml(r.provider?.name || "—")}</td>
      <td>${escapeHtml(r.provider?.speciality || "—")}</td>
      <td>${r.slot?.startsAt ? escapeHtml(formatIST(r.slot.startsAt)) : "—"}</td>
      <td class="status ${(r.appointment?.status || r.status).toLowerCase()}">${escapeHtml(r.appointment?.status || r.status)}</td>
      <td class="amount">${escapeHtml(formatINR(r.amountPaise))}</td>
    </tr>`
    )
    .join("");

  const generatedAt = formatIST(new Date());
  const rangeLabel = `${startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} – ${endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice – ${escapeHtml(ngo?.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #f7f9fc; padding: 32px; color: #0f172a; }
    .page { max-width: 900px; margin: 0 auto; }
    .actions { display: flex; gap: 10px; justify-content: flex-end; margin-bottom: 16px; }
    .btn { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; padding: 8px 16px; border-radius: 999px; font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none; }
    .btn.primary { background: #0f172a; border-color: #0f172a; color: #fff; }
    .card { background: #fff; border-radius: 20px; padding: 32px; box-shadow: 0 8px 32px rgba(15,23,42,0.08); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
    .title { font-size: 24px; font-weight: 700; color: #0f172a; }
    .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
    .meta { text-align: right; font-size: 13px; color: #64748b; line-height: 1.6; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .kpi { background: #f8fafc; border-radius: 12px; padding: 16px; }
    .kpi-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead tr { border-bottom: 2px solid #e2e8f0; }
    th { padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; font-weight: 600; }
    td { padding: 10px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    td.amount { font-weight: 600; text-align: right; }
    .status { text-transform: uppercase; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; display: inline-block; }
    .status.confirmed { background: #dcfce7; color: #15803d; }
    .status.cancelled { background: #fee2e2; color: #b91c1c; }
    .status.held { background: #fef9c3; color: #a16207; }
    .status.pending { background: #f1f5f9; color: #475569; }
    tfoot td { padding: 12px 10px; font-weight: 700; font-size: 14px; border-top: 2px solid #e2e8f0; }
    .footer { margin-top: 28px; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print {
      body { padding: 0; background: #fff; }
      .actions { display: none !important; }
      .card { box-shadow: none; border-radius: 0; padding: 16px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="actions">
      <a class="btn" href="?download=1&start=${escapeHtml(start || "")}&end=${escapeHtml(end || "")}">Download</a>
      <button class="btn primary" type="button" onclick="window.print()">Print</button>
    </div>
    <div class="card">
      <div class="header">
        <div>
          <div class="title">Invoice / Usage Statement</div>
          <div class="subtitle">${escapeHtml(ngo?.name || "NGO")} · Period: ${escapeHtml(rangeLabel)}</div>
        </div>
        <div class="meta">
          <div><strong>CalDoc</strong></div>
          <div>Generated: ${escapeHtml(generatedAt)} IST</div>
        </div>
      </div>

      <div class="summary">
        <div class="kpi">
          <div class="kpi-label">Total reservations</div>
          <div class="kpi-value">${reservations.length}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Confirmed consultations</div>
          <div class="kpi-value">${confirmedCount}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Total charges</div>
          <div class="kpi-value">${escapeHtml(formatINR(totalPaise))}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Booking ID</th>
            <th>Patient</th>
            <th>Doctor</th>
            <th>Speciality</th>
            <th>Slot time</th>
            <th>Status</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="8" style="text-align:center;padding:24px;color:#94a3b8">No reservations in this period.</td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="7">Total (${reservations.length} reservations)</td>
            <td style="text-align:right">${escapeHtml(formatINR(totalPaise))}</td>
          </tr>
        </tfoot>
      </table>

      <div class="footer">
        This is a system-generated statement. For billing queries, contact CalDoc support.
      </div>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      ...(download
        ? { "Content-Disposition": `attachment; filename="caldoc-invoice-${sess.ngoId}.html"` }
        : {}),
    },
  });
}

// src/app/admin/whatsapp/page.tsx
import { requireAdminSession } from "@/lib/auth.server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import WhatsAppTestForm from "./WhatsAppTestForm";

export const dynamic = "force-dynamic";

function masked(val: string | undefined): string {
  if (!val) return "";
  if (val.length <= 8) return "*".repeat(val.length);
  return val.slice(0, 4) + "*".repeat(val.length - 8) + val.slice(-4);
}

function isSet(val: string | undefined) {
  return !!val;
}

type VarRow = { label: string; value: string | undefined; defaultVal?: string };

const envVars: VarRow[] = [
  { label: "WABA_ID", value: process.env.WABA_ID },
  { label: "WHATSAPP_TOKEN", value: process.env.WHATSAPP_TOKEN },
  { label: "WHATSAPP_LANG", value: process.env.WHATSAPP_LANG, defaultVal: "en_US" },
  { label: "SKIP_PATIENT_OTP", value: process.env.SKIP_PATIENT_OTP, defaultVal: "(not set → OTP enabled)" },
  { label: "WHATSAPP_TEMPLATE_PATIENT_LOGIN", value: process.env.WHATSAPP_TEMPLATE_PATIENT_LOGIN, defaultVal: "patient_login_otp" },
  { label: "WHATSAPP_PROVIDER_TEMPLATE", value: process.env.WHATSAPP_PROVIDER_TEMPLATE, defaultVal: "provider_booking_alert" },
  { label: "WHATSAPP_TMPL_CHECKIN", value: process.env.WHATSAPP_TMPL_CHECKIN, defaultVal: "appointment_checkin" },
  { label: "WHATSAPP_TMPL_APPT_REMINDER_24H", value: process.env.WHATSAPP_TMPL_APPT_REMINDER_24H, defaultVal: "appointment_reminder_24hr" },
];

function fmtIST(d: Date) {
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function WhatsAppDiagnosticsPage() {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login");

  const [total, sent, failed, recentMessages] = await Promise.all([
    prisma.outboundMessage.count(),
    prisma.outboundMessage.count({ where: { status: "SENT" } }),
    prisma.outboundMessage.count({ where: { status: "FAILED" } }),
    prisma.outboundMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        createdAt: true,
        channel: true,
        kind: true,
        toPhone: true,
        template: true,
        status: true,
        error: true,
        messageId: true,
      },
    }),
  ]);

  const criticalMissing = !process.env.WABA_ID || !process.env.WHATSAPP_TOKEN;

  return (
    <main className="min-h-screen bg-[#f7f2ea] py-10">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6 lg:px-10">

        <div>
          <h1 className="font-serif text-3xl font-semibold text-slate-900">WhatsApp Diagnostics</h1>
          <p className="mt-1 text-sm text-slate-500">Check configuration, review message history, and send test messages.</p>
        </div>

        {/* Critical warning */}
        {criticalMissing && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
            <p className="font-semibold">⚠️ WhatsApp is not configured</p>
            <p className="mt-1">
              <span className="font-mono">WABA_ID</span> and/or{" "}
              <span className="font-mono">WHATSAPP_TOKEN</span> are missing.
              Messages cannot be sent until these are set in your environment variables.
            </p>
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total messages", value: total, color: "text-slate-800" },
            { label: "Sent", value: sent, color: "text-emerald-700" },
            { label: "Failed", value: failed, color: "text-rose-700" },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{k.label}</p>
              <p className={`mt-1 text-3xl font-semibold tabular-nums ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Env var status */}
        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="font-semibold text-slate-800">Configuration</h2>
          <p className="mt-0.5 text-xs text-slate-500">Credentials shown masked. Set missing vars in Vercel → Settings → Environment Variables.</p>
          <div className="mt-4 divide-y divide-slate-100">
            {envVars.map((row) => {
              const set = isSet(row.value);
              return (
                <div key={row.label} className="flex items-start gap-3 py-2.5">
                  <span className={`mt-0.5 text-base leading-none ${set ? "text-emerald-500" : "text-rose-400"}`}>
                    {set ? "✓" : "✗"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs font-semibold text-slate-700">{row.label}</span>
                    {set ? (
                      <span className="ml-2 font-mono text-xs text-slate-400">{masked(row.value)}</span>
                    ) : (
                      <span className="ml-2 text-xs text-slate-400 italic">
                        {row.defaultVal ? `not set — default: ${row.defaultVal}` : "NOT SET"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Send test message */}
        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="font-semibold text-slate-800">Send test message</h2>
          <p className="mt-0.5 mb-4 text-xs text-slate-500">
            Sends a plain-text WhatsApp message (no template). Use this to verify your WABA credentials are working.
          </p>
          <WhatsAppTestForm />
        </section>

        {/* Recent message log */}
        <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur-sm">
          <h2 className="font-semibold text-slate-800">Recent messages</h2>
          <p className="mt-0.5 text-xs text-slate-500">Last 30 outbound messages across all channels.</p>

          {recentMessages.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400 italic">No messages sent yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    <th className="pb-2 pr-3">Time (IST)</th>
                    <th className="pb-2 pr-3">To</th>
                    <th className="pb-2 pr-3">Kind</th>
                    <th className="pb-2 pr-3">Template</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2">Error / Message ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentMessages.map((m) => (
                    <tr key={m.id} className="align-top">
                      <td className="py-2 pr-3 font-mono text-slate-500 whitespace-nowrap">
                        {fmtIST(new Date(m.createdAt))}
                      </td>
                      <td className="py-2 pr-3 font-mono text-slate-700 whitespace-nowrap">{m.toPhone}</td>
                      <td className="py-2 pr-3 text-slate-600 whitespace-nowrap">{m.kind}</td>
                      <td className="py-2 pr-3 font-mono text-slate-500 whitespace-nowrap">
                        {m.template || <span className="italic text-slate-300">text</span>}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            m.status === "SENT"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-2 font-mono text-slate-400 break-all">
                        {m.error ? (
                          <span className="text-rose-600">{m.error}</span>
                        ) : m.messageId ? (
                          <span className="text-emerald-700">{m.messageId}</span>
                        ) : (
                          <span className="italic text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

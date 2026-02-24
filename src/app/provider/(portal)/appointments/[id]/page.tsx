import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readProviderSession, requireAdminSession } from "@/lib/auth.server";
import AppointmentActions from "./AppointmentActions";
import VisitNoteForm from "./VisitNoteForm";
import PrescriptionForm from "./PrescriptionForm";
import AppointmentFeeForm from "./AppointmentFeeForm";
import CopyRoomLinkButton from "./CopyRoomLinkButton";
import LabOrderForm from "./LabOrderForm";
import { formatINR } from "@/lib/format";
import CallPatientButton from "./CallPatientButton";
import CheckInFormViewer from "./CheckInFormViewer";
import { normalizeDrugCategory, type Medicine } from "@/lib/medication";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
};

type RawPrescriptionMed = {
  name?: string;
  sig?: string;
  qty?: string;
  category?: string;
};

function categoryLabel(value: unknown) {
  switch (value) {
    case "LIST_O":
      return "List O";
    case "LIST_A":
      return "List A";
    case "LIST_B":
      return "List B";
    case "SCHEDULE_X":
      return "Schedule X";
    default:
      return "OTC";
  }
}

function formatIST(date: Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });
}

export default async function ProviderAppointmentDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const providerSess = await readProviderSession();
  const adminSess = await requireAdminSession();
  const viewingAsAdmin = Boolean(adminSess);
  const cameFromAdmin = viewingAsAdmin || sp.from === "admin";

  if (!providerSess && !viewingAsAdmin) {
    const nextSearch = new URLSearchParams();
    if (sp.from) nextSearch.set("from", sp.from);
    const nextPath = `/provider/appointments/${id}${nextSearch.toString() ? `?${nextSearch.toString()}` : ""}`;
    redirect(`/provider/login?next=${encodeURIComponent(nextPath)}`);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: true,
      provider: true,
      slot: true,
      patientDocuments: true,
      visitNote: true,
      prescription: true,
      checkInForm: { select: { completedAt: true, chiefComplaint: true } },
      labOrders: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!appointment || (!viewingAsAdmin && providerSess && appointment.providerId !== providerSess.pid)) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-10">
        <Link
          href={cameFromAdmin ? "/admin" : "/provider/appointments"}
          className="text-sm font-medium text-[#2f6ea5] hover:text-[#255b8b]"
        >
          ← Back to {cameFromAdmin ? "admin dashboard" : "appointments"}
        </Link>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-red-700">Appointment not found</h1>
          <p className="text-sm text-red-600">
            Either it does not exist or it does not belong to your account.
          </p>
        </div>
      </main>
    );
  }

  const documents = appointment.patientDocuments || [];
  const rawPrescriptionMeds: RawPrescriptionMed[] = Array.isArray(appointment.prescription?.meds)
    ? (appointment.prescription?.meds as RawPrescriptionMed[])
    : [];
  const initialPrescriptionMeds: Medicine[] = rawPrescriptionMeds.map((med) => ({
    name: med.name ?? "",
    sig: med.sig ?? "",
    qty: med.qty ?? "",
    category: normalizeDrugCategory(med.category),
  }));
  const availableSlots = await prisma.slot.findMany({
    where: {
      providerId: appointment.providerId,
      isBooked: false,
      startsAt: { gt: new Date() },
    },
    orderBy: { startsAt: "asc" },
    take: 12,
    select: { id: true, startsAt: true },
  });

  const readOnly = viewingAsAdmin;
  const effectiveFeePaise =
    appointment.feePaise ??
    appointment.slot?.feePaise ??
    appointment.provider?.defaultFeePaise ??
    null;
  const isAudioVisit = appointment.visitMode === "AUDIO";
  const withProviderFlag = (url: string) => (url.includes("?") ? `${url}&from=provider` : `${url}?from=provider`);
  const providerVideoRoomHref = appointment.videoRoom ? withProviderFlag(appointment.videoRoom) : null;
  const labOrderData = (appointment.labOrders || []).map((order) => ({
    id: order.id,
    status: order.status,
    tests: Array.isArray(order.tests)
      ? (order.tests as unknown as Array<{ name?: string; qty?: number } | string>).map((t) => {
          if (typeof t === "string") return t;
          const name = String(t?.name || "");
          const qty = Math.max(1, Number(t?.qty) || 1);
          return qty > 1 ? `${name} × ${qty}` : name;
        })
      : order.tests
      ? [String(order.tests)]
      : [],
    createdAtLabel: formatIST(order.createdAt),
    deliveryMode: order.deliveryMode,
  }));

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 text-gray-900">
      <div className="flex items-center justify-between">
        <Link
          href={cameFromAdmin ? "/admin" : "/provider/appointments"}
          className="text-sm font-medium text-[#2f6ea5] hover:text-[#255b8b]"
        >
          ← Back to {cameFromAdmin ? "admin dashboard" : "appointments"}
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Status:{" "}
          <span
            className={`rounded-full px-3 py-1 text-xs ${
              appointment.status === "CONFIRMED"
                ? "bg-green-50 text-green-700"
                : appointment.status === "CANCELLED"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {appointment.status}
          </span>
        </span>
      </div>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <h1 className="font-serif text-2xl font-semibold text-slate-900">Visit details</h1>
        <p className="text-sm text-slate-500">
          Review the booking, confirm it for the patient, or cancel if needed.
        </p>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Appointment ID
            </dt>
            <dd className="font-mono text-sm text-slate-900">{appointment.id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Slot start
            </dt>
            <dd className="text-sm text-slate-900">
              {formatIST(appointment.slot?.startsAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Consultation fee</dt>
            <dd className="text-sm text-slate-900">
              {formatINR(effectiveFeePaise)}
            </dd>
            {!readOnly && (
              <AppointmentFeeForm
                appointmentId={appointment.id}
                initialFeePaise={effectiveFeePaise}
              />
            )}
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Consult mode</dt>
            <dd className="text-sm text-slate-900">{appointment.visitMode === "AUDIO" ? "Audio call" : "Video call"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Video room</dt>
            {isAudioVisit ? (
              <div className="space-y-2">
                <dd className="text-sm text-slate-600">
                  This appointment is audio-only. Tap below to connect via CalDoc&apos;s bridge when you&apos;re ready.
                </dd>
                <CallPatientButton
                  appointmentId={appointment.id}
                  patientName={appointment.patientName || appointment.patient?.name}
                />
              </div>
            ) : appointment.videoRoom ? (
              <div className="space-y-2">
                <dd className="text-sm text-slate-900">
                  <a
                    href={providerVideoRoomHref || appointment.videoRoom}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-[#2f6ea5] hover:text-[#255b8b]"
                  >
                    {appointment.videoRoom}
                  </a>
                </dd>
                <CopyRoomLinkButton link={appointment.videoRoom} />
                <p className="text-xs text-slate-500">Copy or share this link if you need to invite additional staff.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <dd className="text-sm text-slate-600">
                  We&apos;ll auto-generate a Daily room as soon as payment is confirmed.
                </dd>
                <Link
                  href={`/visit/${appointment.id}?from=provider`}
                  className="inline-flex w-full max-w-xs items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
                >
                  Prepare room
                </Link>
              </div>
            )}
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Patient
            </dt>
            <dd className="text-sm font-medium text-slate-900">
              {appointment.patientName || appointment.patient?.name || "—"}
            </dd>
            <dd className="text-xs text-slate-500">
              {appointment.patient?.phone ?? "No phone"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Delivery preference
            </dt>
            <dd className="text-sm text-slate-900">{appointment.deliveryOpt ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Created at
            </dt>
            <dd className="text-sm text-slate-900">{formatIST(appointment.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">
              Upload link sent
            </dt>
            <dd className="text-sm text-slate-900">
              {appointment.uploadLinkSentAt ? formatIST(appointment.uploadLinkSentAt) : "Not yet"}
            </dd>
          </div>
        </dl>

        {!readOnly && (
          <div className="mt-8">
            <AppointmentActions
              appointmentId={appointment.id}
              currentStatus={appointment.status}
              uploadLinkSent={Boolean(appointment.uploadLinkSentAt)}
              availableSlots={availableSlots.map((slot) => ({
                id: slot.id,
                startsAt: slot.startsAt.toISOString(),
              }))}
              patientPhone={appointment.patient?.phone ?? null}
            />
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-900">Patient documents</h2>
            <p className="text-sm text-slate-500">
              Attachments uploaded from the patient portal or secure link.
            </p>
          </div>
          {documents.length > 0 && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {documents.length} file{documents.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No documents uploaded yet. Confirm the appointment to automatically send a secure
            upload link to the patient.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {documents.map((doc) => (
              <li key={doc.id} className="py-3 text-sm">
                <div className="font-medium text-slate-900">{doc.fileName}</div>
                <div className="text-xs text-slate-500">
                  Uploaded {formatIST(doc.createdAt)} · {doc.contentType ?? "unknown type"}
                </div>
                <Link
                  href={`/api/provider/documents/${doc.id}`}
                  target="_blank"
                  className="mt-2 inline-flex items-center text-xs font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
                >
                  View / download
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Pre-visit check-in form ── */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-900">Pre-visit check-in</h2>
            <p className="text-sm text-slate-500">
              Medical history, allergies, current symptoms and vitals submitted by the patient.
            </p>
          </div>
          {appointment.checkInForm?.completedAt ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Completed
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Not submitted
            </span>
          )}
        </div>

        {appointment.checkInForm?.completedAt ? (
          <div className="mt-4 space-y-3">
            {appointment.checkInForm.chiefComplaint && (
              <div className="rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Chief complaint
                </p>
                <p className="mt-1 text-sm text-slate-800">{appointment.checkInForm.chiefComplaint}</p>
              </div>
            )}
            <CheckInFormViewer appointmentId={appointment.id} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            The patient has not yet submitted their pre-visit check-in form. They will receive a
            reminder with the form link before the appointment.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <h2 className="font-serif text-lg font-semibold text-slate-900">Visit notes</h2>
        <p className="text-sm text-slate-500">Share clinical notes with the patient portal.</p>
        {readOnly ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            <p>{appointment.visitNote?.text || "No note recorded yet."}</p>
          </div>
        ) : (
          <div className="mt-4">
            <VisitNoteForm appointmentId={appointment.id} initialText={appointment.visitNote?.text || ""} />
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-slate-900">Prescription</h2>
            <p className="text-sm text-slate-500">Add medicines to generate a PDF for the patient.</p>
          </div>
          {appointment.prescription?.pdfKey && (
            <Link
              href={`/api/appointments/${appointment.id}/prescription.pdf`}
              target="_blank"
              className="text-xs font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
            >
              View current PDF
            </Link>
          )}
        </div>
        {readOnly ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
            {rawPrescriptionMeds.length ? (
              <ul className="space-y-1 text-sm">
                {rawPrescriptionMeds.map((med, idx) => (
                  <li key={idx}>
                    <span className="font-semibold">{med.name}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      Category: {categoryLabel(med.category)}
                    </span>
                    {med.sig && <span className="ml-2 text-xs text-slate-500">Sig: {med.sig}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No prescription recorded.</p>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <PrescriptionForm appointmentId={appointment.id} initialMeds={initialPrescriptionMeds} />
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)]">
        <h2 className="font-serif text-lg font-semibold text-slate-900">Labs</h2>
        <p className="text-sm text-slate-500">
          Choose whether CalDoc labs or the patient will handle tests, then list the required panels.
        </p>
        <div className="mt-4">
          <LabOrderForm appointmentId={appointment.id} existingOrders={labOrderData} />
        </div>
      </section>
    </main>
  );
}

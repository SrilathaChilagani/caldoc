import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";
import UploadDocumentsForm from "./UploadDocumentsForm";
import CancelAppointmentButton from "./CancelAppointmentButton";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatIST(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatISTShort(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeTests(tests: unknown): string {
  if (!Array.isArray(tests)) return "";
  return tests
    .map((t) => String((t as { name?: string })?.name || t || "").trim())
    .filter(Boolean)
    .join(", ");
}

const statusLabels: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING: "Pending",
  COMPLETED: "Completed",
  CANCELED: "Cancelled",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
  IN_PROGRESS: "In progress",
};

const labStatusInfo: Record<string, { label: string; colorClass: string }> = {
  PENDING:          { label: "Pending",          colorClass: "text-amber-600" },
  AWAITING_PAYMENT: { label: "Awaiting payment", colorClass: "text-amber-600" },
  CONFIRMED:        { label: "Confirmed",         colorClass: "text-blue-600" },
  SAMPLE_COLLECTED: { label: "Sample collected",  colorClass: "text-blue-600" },
  PROCESSING:       { label: "Processing",        colorClass: "text-indigo-600" },
  REPORTS_READY:    { label: "Results ready",     colorClass: "text-emerald-700 font-semibold" },
  COMPLETED:        { label: "Completed",         colorClass: "text-emerald-700" },
  CANCELLED:        { label: "Cancelled",         colorClass: "text-slate-400" },
};

export default async function PatientAppointmentDetail({ params }: PageProps) {
  const { id } = await params;
  const session = await readPatientSession();
  if (!session) {
    redirect(`/patient/login?next=/patient/appointments/${id}`);
  }

  const patient = await prisma.patient.findUnique({
    where: { phone: session.phone },
    select: { id: true, name: true, phone: true },
  });

  if (!patient) {
    redirect(`/patient/login?next=/patient/appointments/${id}`);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      provider: true,
      slot: true,
      prescription: true,
      payment: true,
      visitNote: true,
      labOrders: {
        orderBy: { createdAt: "asc" },
      },
      pharmacyFulfillment: true,
      patientDocuments: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!appointment || appointment.patientId !== patient.id) {
    redirect("/patient/appointments?err=notfound");
  }

  const scheduledFor = appointment.slot?.startsAt ?? appointment.createdAt;
  const receiptUrl = appointment.payment?.receiptUrl;
  const isCompleted = ["COMPLETED", "IN_PROGRESS"].includes(appointment.status);
  const hasLabOrders = appointment.labOrders.length > 0;

  // Build follow-up booking URL with context
  const provider = appointment.provider;
  const followUpNote = `Follow-up for consultation on ${formatISTShort(scheduledFor)}`;
  const followUpPath = provider
    ? `/book/${encodeURIComponent(provider.slug || provider.id)}?followUpNote=${encodeURIComponent(followUpNote)}`
    : null;

  return (
    <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10">
      <div className="mx-auto max-w-5xl space-y-6 px-4">

        {/* Header */}
        <div className="space-y-3">
          <Link href="/patient/appointments" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back to appointments
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#2f6ea5]">Appointment details</p>
              <h1 className="mt-1 font-serif text-3xl text-slate-900">
                {provider?.name || "Your doctor"}
              </h1>
              <p className="text-sm text-slate-500">
                {provider?.speciality || "Teleconsultation"} · {formatIST(scheduledFor)}
              </p>
              <p className="text-sm text-slate-500">
                Patient: {appointment.patientName || patient.name || "Patient"}
              </p>
            </div>
            {["PENDING", "CONFIRMED"].includes(appointment.status) && (
              <CancelAppointmentButton appointmentId={appointment.id} />
            )}
          </div>
        </div>

        {/* Status / Prescription / Receipt */}
        <section className="grid gap-6 border-b border-slate-200 pb-6 md:grid-cols-3">
          <div className="py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {statusLabels[appointment.status] ?? appointment.status.replace(/_/g, " ")}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Consult mode: {appointment.visitMode === "AUDIO" ? "Audio call" : "Video call"}
            </p>
            {appointment.visitMode === "AUDIO" && (
              <p className="mt-1 text-xs text-amber-600">
                Stay near your phone. The doctor will call the registered number at the scheduled time.
              </p>
            )}
            {appointment.videoRoom && (
              <a
                href={appointment.videoRoom}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
              >
                Join visit
              </a>
            )}
          </div>
          <div className="py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Prescription</p>
            {appointment.prescription ? (
              <a
                href={`/api/appointments/${appointment.id}/prescription.pdf`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              >
                View PDF
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Not issued yet.</p>
            )}
          </div>
          <div className="py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Receipt</p>
            {receiptUrl ? (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]"
              >
                Download receipt
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Receipt will be available after payment capture.</p>
            )}
          </div>
        </section>

        {/* ── Care summary — shown once there are outputs from the consultation ── */}
        {(isCompleted || hasLabOrders || appointment.prescription) && (
          <section className="rounded-2xl border border-[#2f6ea5]/15 bg-[#f0f5fa] px-6 py-5 border-b border-slate-200 pb-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-[#2f6ea5]">
              After your visit
            </h2>

            {/* Lab orders */}
            {hasLabOrders && (
              <div className="mb-5">
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Lab tests ordered
                </p>
                <div className="space-y-3">
                  {appointment.labOrders.map((order) => {
                    const testNames = normalizeTests(order.tests);
                    const info = labStatusInfo[order.status] ?? { label: order.status, colorClass: "text-slate-600" };
                    return (
                      <div key={order.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {testNames || "Lab tests"}
                          </p>
                          <p className={`mt-0.5 text-xs ${info.colorClass}`}>{info.label}</p>
                        </div>
                        {order.resultsPdfKey && (
                          <a
                            href={`/api/patient/lab-orders/results/${order.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Download results
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CTAs row */}
            <div className="flex flex-wrap gap-3">
              {appointment.prescription && (
                <a
                  href={`/services/rx-delivery?appointmentId=${appointment.id}`}
                  className="inline-flex items-center gap-2 rounded-full bg-[#2f6ea5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#255b8b]"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 3h6a4 4 0 010 8H9a4 4 0 010-8z" /><path d="M8 21h8a4 4 0 000-8H8a4 4 0 000 8z" />
                  </svg>
                  Order medicines
                </a>
              )}
              {followUpPath && (
                <Link
                  href={followUpPath}
                  className="inline-flex items-center gap-2 rounded-full border border-[#2f6ea5] px-5 py-2.5 text-sm font-semibold text-[#2f6ea5] hover:bg-[#2f6ea5]/5"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                  </svg>
                  Book follow-up
                </Link>
              )}
            </div>

            {appointment.visitNote?.text && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor&apos;s notes</p>
                <p className="whitespace-pre-line text-sm text-slate-700">{appointment.visitNote.text}</p>
              </div>
            )}
          </section>
        )}

        {/* Doctor's notes (standalone, for non-completed appointments) */}
        {!isCompleted && !appointment.prescription && (
          <section className="border-b border-slate-200 pb-6">
            <h2 className="font-serif text-xl text-slate-900">Doctor&apos;s notes</h2>
            {appointment.visitNote ? (
              <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{appointment.visitNote.text}</p>
            ) : (
              <p className="mt-3 text-sm text-slate-500">No notes have been shared for this appointment yet.</p>
            )}
          </section>
        )}

        {/* Patient documents */}
        <section className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-serif text-xl text-slate-900">Patient documents</h2>
              <p className="text-sm text-slate-500">
                Upload lab reports, scans, or any supporting files for this appointment.
              </p>
            </div>
            <UploadDocumentsForm appointmentId={appointment.id} />
          </div>

          {appointment.patientDocuments.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No documents uploaded yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {appointment.patientDocuments.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-slate-900">{doc.fileName}</p>
                    <p className="text-xs text-slate-500">
                      Uploaded {formatIST(doc.createdAt)} · {doc.contentType || "document"}
                    </p>
                  </div>
                  <a
                    href={`/api/patient/documents/${doc.id}`}
                    className="text-sm font-semibold text-[#2f6ea5] hover:text-[#255b8b]"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Provider credentials */}
        <section className="pt-2">
          <h2 className="font-serif text-xl text-slate-900">Provider credentials</h2>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Qualification</dt>
              <dd className="font-medium text-slate-900">{provider?.qualification || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Registration number</dt>
              <dd className="font-medium text-slate-900">{provider?.registrationNumber || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Council</dt>
              <dd className="font-medium text-slate-900">{provider?.councilName || "Not provided"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Consultations on CalDoc follow the Telemedicine Practice Guidelines (India, 2020). For emergencies or red-flag
            symptoms, call local emergency services or visit the nearest hospital immediately.
          </p>
        </section>
      </div>
    </main>
  );
}

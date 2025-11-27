import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { readPatientSession } from "@/lib/patientAuth.server";
import UploadDocumentsForm from "./UploadDocumentsForm";

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

  return (
    <main className="min-h-[calc(100vh-140px)] bg-gradient-to-b from-[#eef3ff] via-white to-white py-10">
      <div className="mx-auto max-w-5xl space-y-6 px-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Appointment details</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">
              {appointment.provider?.name || "Your doctor"}
            </h1>
            <p className="text-sm text-slate-500">
              {appointment.provider?.speciality || "Teleconsultation"} · {formatIST(scheduledFor)}
            </p>
          </div>
          <Link href="/patient/appointments" className="text-sm font-semibold text-blue-600 hover:text-blue-800">
            ← Back to appointments
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
            <p className="mt-2 text-xl font-semibold text-slate-900">{appointment.status}</p>
            <p className="mt-2 text-xs text-slate-500">
              Consult mode: {appointment.visitMode === "AUDIO" ? "Audio call" : "Video call"}
            </p>
            {appointment.visitMode === "AUDIO" && (
              <p className="mt-1 text-xs text-amber-600">
                Stay near your phone. The doctor will call the registered number at the scheduled time.
              </p>
            )}
            {appointment.videoRoom && appointment.status === "CONFIRMED" && (
              <a
                href={appointment.videoRoom}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Join visit
              </a>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Prescription</p>
            {appointment.prescription ? (
              <a
                href={`/api/appointments/${appointment.id}/prescription.pdf`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-400 hover:text-blue-700"
              >
                View PDF
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Not uploaded yet.</p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Receipt</p>
            {receiptUrl ? (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-400 hover:text-blue-700"
              >
                Download receipt
              </a>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Receipt will be available after payment capture.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Patient documents</h2>
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
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800"
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

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Doctor&apos;s notes</h2>
          {appointment.visitNote ? (
            <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{appointment.visitNote.text}</p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No notes have been shared for this appointment yet.</p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Provider credentials</h2>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2 text-sm text-slate-600">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Qualification</dt>
              <dd className="font-medium text-slate-900">{appointment.provider?.qualification || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Registration number</dt>
              <dd className="font-medium text-slate-900">{appointment.provider?.registrationNumber || "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Council</dt>
              <dd className="font-medium text-slate-900">{appointment.provider?.councilName || "Not provided"}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Consultations on CalDoc follow the CalDocicine Practice Guidelines (India, 2020). For emergencies or red-flag
            symptoms, call local emergency services or visit the nearest hospital immediately.
          </p>
        </section>
      </div>
    </main>
  );
}

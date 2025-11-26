import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifyPatientUploadToken } from "@/lib/patientUploadToken";
import UploadClient from "./UploadClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ token?: string }>;
};

function fmtIST(date: Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "short",
  });
}

export default async function PatientUploadPage({ searchParams }: PageProps) {
  const sp = (await searchParams) || {};
  const token = sp.token;

  if (!token) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <h1 className="text-2xl font-semibold text-red-700">Upload link invalid</h1>
        <p className="text-sm text-slate-600">
          We could not find a secure token. Please open the link from your WhatsApp message again.
        </p>
      </main>
    );
  }

  const decoded = verifyPatientUploadToken(token);
  if (!decoded) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <h1 className="text-2xl font-semibold text-red-700">Link expired</h1>
        <p className="text-sm text-slate-600">
          This secure link has expired. Please request a new upload link from your provider or log
          in to the patient portal to upload documents.
        </p>
      </main>
    );
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: decoded.appointmentId },
    include: {
      patient: true,
      provider: true,
      patientDocuments: true,
      slot: true,
    },
  });

  if (
    !appointment ||
    !appointment.patient ||
    appointment.patientId !== decoded.patientId
  ) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
        <h1 className="text-2xl font-semibold text-red-700">Appointment not found</h1>
        <p className="text-sm text-slate-600">
          We could not locate the appointment associated with this link. Contact support if the issue
          persists.
        </p>
      </main>
    );
  }

  const documents = appointment.patientDocuments ?? [];

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-16">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Secure upload
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          Upload reports for your appointment
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          These files will be shared only with{" "}
          <span className="font-semibold text-slate-900">
            {appointment.provider?.name || "your doctor"}
          </span>{" "}
          for the visit scheduled on {fmtIST(appointment.slot?.startsAt)}.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Tip: You can also log in to the patient portal later to manage your documents.
        </p>
      </div>

      <UploadClient token={token} />

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Uploaded documents</h2>
          <span className="text-sm text-slate-500">
            {documents.length} file{documents.length === 1 ? "" : "s"}
          </span>
        </div>
        {documents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            No documents uploaded yet. Upload lab reports, prescriptions, or photographs that will
            help your doctor review the case.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {documents.map((doc) => (
              <li key={doc.id} className="py-3">
                <div className="text-sm font-medium text-slate-900">{doc.fileName}</div>
                <div className="text-xs text-slate-500">
                  Uploaded {fmtIST(doc.createdAt)} · {doc.contentType || "document"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="text-center text-sm text-slate-500">
        Need help? Email{" "}
        <a className="text-blue-600 underline" href="mailto:support@telemed.local">
          support@telemed.local
        </a>{" "}
        or{" "}
        <Link className="text-blue-600 underline" href="/patient/login">
          sign in to the patient portal
        </Link>
        .
      </div>
    </main>
  );
}

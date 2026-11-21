import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";
import EmployeeActions from "./EmployeeActions";
import DocumentsPanel from "./DocumentsPanel";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  ON_LEAVE: "bg-amber-50 text-amber-700",
  TERMINATED: "bg-rose-50 text-rose-700",
  RESIGNED: "bg-slate-100 text-slate-600",
};

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERN: "Intern",
};

const LOCATION_LABELS: Record<string, string> = {
  OFFICE: "Office",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  FIELD: "Field",
};

type Props = { params: Promise<{ id: string }> };

export default async function EmployeeProfilePage({ params }: Props) {
  const sess = await requireOperationsSession();
  if (!sess) redirect("/admin/login");

  const { id } = await params;

  const [employee, departments] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        reportingManager: { select: { id: true, name: true, jobTitle: true } },
        directReports: { select: { id: true, name: true, jobTitle: true, status: true } },
      },
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!employee) notFound();

  const serialized = {
    ...employee,
    dob: employee.dob?.toISOString() ?? null,
    joiningDate: employee.joiningDate.toISOString(),
    exitDate: employee.exitDate?.toISOString() ?? null,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
    directReports: employee.directReports,
  };

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <Link href="/admin/hr/staff" className="text-xs font-medium text-[#2f6ea5] hover:underline">
            ← Staff directory
          </Link>
          <h1 className="mt-1 font-serif text-3xl text-slate-900">{employee.name}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {employee.employeeCode} · {employee.jobTitle} · {employee.department.name}
          </p>
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-xs font-semibold uppercase ${STATUS_COLORS[employee.status] ?? "bg-slate-100 text-slate-600"}`}>
          {employee.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: detail cards */}
        <div className="lg:col-span-2 space-y-4">
          {/* Employment */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Employment</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Department", value: employee.department.name },
                { label: "Job title", value: employee.jobTitle },
                { label: "Type", value: TYPE_LABELS[employee.employeeType] ?? employee.employeeType },
                { label: "Location", value: LOCATION_LABELS[employee.workLocation] ?? employee.workLocation },
                { label: "Joining date", value: new Date(employee.joiningDate).toLocaleDateString("en-IN") },
                { label: "Basic salary", value: employee.basicSalaryPaise ? `₹${(employee.basicSalaryPaise / 100).toLocaleString("en-IN")}/mo` : "Not set" },
                { label: "System role", value: employee.systemRole ?? "None" },
                { label: "Reporting to", value: employee.reportingManager ? `${employee.reportingManager.name} (${employee.reportingManager.jobTitle})` : "—" },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{row.label}</dt>
                  <dd className="mt-0.5 text-sm text-slate-800">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Contact</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Email", value: employee.email },
                { label: "Phone", value: employee.phone },
                { label: "Emergency contact", value: employee.emergencyContactName ?? "—" },
                { label: "Emergency phone", value: employee.emergencyContactPhone ?? "—" },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{row.label}</dt>
                  <dd className="mt-0.5 text-sm text-slate-800">{row.value}</dd>
                </div>
              ))}
            </dl>
            {(employee.addressLine1 || employee.city) && (
              <div className="mt-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Home address</dt>
                <dd className="mt-0.5 text-sm text-slate-800">
                  {[employee.addressLine1, employee.addressLine2, employee.city, employee.state, employee.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
            )}
          </div>

          {/* Direct reports */}
          {employee.directReports.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Direct reports ({employee.directReports.length})</h2>
              <div className="space-y-2">
                {employee.directReports.map((r) => (
                  <Link key={r.id} href={`/admin/hr/staff/${r.id}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
                    <span className="text-sm text-slate-900">{r.name} <span className="text-slate-400">— {r.jobTitle}</span></span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {r.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {employee.notes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="mb-2 text-sm font-semibold text-slate-900">Internal notes</h2>
              <p className="text-sm text-slate-600 whitespace-pre-line">{employee.notes}</p>
            </div>
          )}

          {/* Documents */}
          <DocumentsPanel employeeId={id} />
        </div>

        {/* Right: actions */}
        <div>
          <EmployeeActions employee={serialized} departments={departments} />
        </div>
      </div>
    </>
  );
}

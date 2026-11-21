import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      reportingManager: { select: { id: true, name: true, jobTitle: true } },
      directReports: { select: { id: true, name: true, jobTitle: true, status: true } },
    },
  });

  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...employee,
    dob: employee.dob?.toISOString() ?? null,
    joiningDate: employee.joiningDate.toISOString(),
    exitDate: employee.exitDate?.toISOString() ?? null,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    "name", "phone", "dob", "gender",
    "departmentId", "jobTitle", "employeeType", "workLocation",
    "joiningDate", "exitDate", "exitReason", "status",
    "reportingManagerId", "basicSalaryPaise",
    "systemRole", "systemAccountId",
    "emergencyContactName", "emergencyContactPhone",
    "addressLine1", "addressLine2", "city", "state", "pincode",
    "notes",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      if (field === "dob" || field === "joiningDate" || field === "exitDate") {
        data[field] = body[field] ? new Date(body[field]) : null;
      } else {
        data[field] = body[field] ?? null;
      }
    }
  }

  const employee = await prisma.employee.update({
    where: { id },
    data,
    include: { department: { select: { id: true, name: true } } },
  });

  return NextResponse.json({
    ...employee,
    dob: employee.dob?.toISOString() ?? null,
    joiningDate: employee.joiningDate.toISOString(),
    exitDate: employee.exitDate?.toISOString() ?? null,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  });
}

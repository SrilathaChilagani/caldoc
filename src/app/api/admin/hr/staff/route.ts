import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireOperationsSession } from "@/lib/auth.server";

export const dynamic = "force-dynamic";

function generateEmployeeCode(): string {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.floor(Math.random() * 900 + 100);
  return `EMP-${ym}-${rand}`;
}

export async function GET(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const departmentId = searchParams.get("departmentId") || undefined;
  const q = searchParams.get("q") || undefined;

  const employees = await prisma.employee.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { employeeCode: { contains: q, mode: "insensitive" } },
              { jobTitle: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      email: true,
      phone: true,
      jobTitle: true,
      employeeType: true,
      status: true,
      workLocation: true,
      joiningDate: true,
      systemRole: true,
      department: { select: { id: true, name: true } },
      reportingManager: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    employees.map((e) => ({ ...e, joiningDate: e.joiningDate.toISOString() }))
  );
}

export async function POST(req: NextRequest) {
  const sess = await requireOperationsSession();
  if (!sess) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name, email, phone, dob, gender,
    departmentId, jobTitle, employeeType, workLocation,
    joiningDate, reportingManagerId,
    basicSalaryPaise,
    systemRole, systemAccountId,
    emergencyContactName, emergencyContactPhone,
    addressLine1, addressLine2, city, state, pincode,
    notes,
  } = body;

  if (!name || !email || !phone || !departmentId || !jobTitle || !joiningDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Ensure unique employee code (retry on collision)
  let employeeCode = generateEmployeeCode();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.employee.findUnique({ where: { employeeCode } });
    if (!exists) break;
    employeeCode = generateEmployeeCode();
  }

  const employee = await prisma.employee.create({
    data: {
      employeeCode,
      name,
      email,
      phone,
      dob: dob ? new Date(dob) : null,
      gender: gender || null,
      departmentId,
      jobTitle,
      employeeType: employeeType || "FULL_TIME",
      workLocation: workLocation || "OFFICE",
      joiningDate: new Date(joiningDate),
      reportingManagerId: reportingManagerId || null,
      basicSalaryPaise: basicSalaryPaise || 0,
      systemRole: systemRole || null,
      systemAccountId: systemAccountId || null,
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      notes: notes || null,
    },
    include: { department: { select: { name: true } } },
  });

  return NextResponse.json(
    { ...employee, joiningDate: employee.joiningDate.toISOString(), createdAt: employee.createdAt.toISOString(), updatedAt: employee.updatedAt.toISOString() },
    { status: 201 }
  );
}

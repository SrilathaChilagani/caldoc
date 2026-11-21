-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "departmentId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "employeeType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "exitDate" TIMESTAMP(3),
    "exitReason" TEXT,
    "reportingManagerId" TEXT,
    "basicSalaryPaise" INTEGER NOT NULL DEFAULT 0,
    "workLocation" TEXT NOT NULL DEFAULT 'OFFICE',
    "systemRole" TEXT,
    "systemAccountId" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_reportingManagerId_idx" ON "Employee"("reportingManagerId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_reportingManagerId_fkey" FOREIGN KEY ("reportingManagerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default departments
INSERT INTO "Department" ("id", "name", "description", "isActive", "createdAt", "updatedAt") VALUES
('dept_admin',    'Administration',    'Admin and operations team',              true, NOW(), NOW()),
('dept_clinical', 'Clinical',          'Medical and clinical staff',             true, NOW(), NOW()),
('dept_frontdesk','Front Desk',        'Patient reception and scheduling',       true, NOW(), NOW()),
('dept_lab',      'Lab Operations',    'Lab collection and processing staff',    true, NOW(), NOW()),
('dept_pharmacy', 'Pharmacy',          'Pharmacy dispatch and fulfillment',      true, NOW(), NOW()),
('dept_tech',     'Technology',        'Engineering and product team',           true, NOW(), NOW()),
('dept_support',  'Customer Support',  'Patient support and care coordination',  true, NOW(), NOW());

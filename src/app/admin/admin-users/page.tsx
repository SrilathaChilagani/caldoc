import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth.server";
import AdminUsersClient from "./AdminUsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const sess = await requireAdminSession();
  if (!sess) redirect("/admin/login?next=/admin/admin-users");

  const isSuperAdmin = sess.role === "SUPER_ADMIN";

  const users = await prisma.adminUser.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#2f6ea5]">System</p>
        <h1 className="font-serif text-3xl text-slate-900">Admin users</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage who has access to the CalDoc admin portal and their permission level.
        </p>
      </div>
      <AdminUsersClient
        currentUserId={sess.userId}
        isSuperAdmin={isSuperAdmin}
        initialUsers={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      />
    </>
  );
}

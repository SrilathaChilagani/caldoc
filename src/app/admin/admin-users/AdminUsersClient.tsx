"use client";

import { useState } from "react";

const ROLES = ["SUPER_ADMIN", "OPERATIONS", "SUPPORT", "FINANCE"] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  OPERATIONS:  "Operations",
  SUPPORT:     "Support",
  FINANCE:     "Finance",
};

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-800",
  OPERATIONS:  "bg-blue-100 text-blue-800",
  SUPPORT:     "bg-green-100 text-green-800",
  FINANCE:     "bg-amber-100 text-amber-800",
};

type AdminUser = { id: string; email: string; role: string; createdAt: string };

type Props = {
  currentUserId: string;
  isSuperAdmin: boolean;
  initialUsers: AdminUser[];
};

export default function AdminUsersClient({ currentUserId, isSuperAdmin, initialUsers }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("SUPPORT");
  const [error, setError] = useState("");

  async function createUser() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setUsers((prev) => [...prev, data.user]);
      setNewEmail(""); setNewPassword(""); setNewRole("SUPPORT"); setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(id: string, role: Role) {
    const res = await fetch(`/api/admin/admin-users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Remove ${email} from admin access?`)) return;
    const res = await fetch(`/api/admin/admin-users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div className="space-y-6">
      {isSuperAdmin && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-[#2f6ea5] px-4 py-2 text-sm font-medium text-white hover:bg-[#265d8e] transition-colors"
          >
            {showCreate ? "Cancel" : "Add admin user"}
          </button>
        </div>
      )}

      {showCreate && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">New admin user</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@caldoc.in"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password (min 10 chars)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={createUser}
            disabled={creating || !newEmail || !newPassword}
            className="rounded-lg bg-[#2f6ea5] px-4 py-2 text-sm font-medium text-white hover:bg-[#265d8e] disabled:opacity-50 transition-colors"
          >
            {creating ? "Creating…" : "Create user"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left">
              <th className="px-4 py-3 font-medium text-slate-500">Email</th>
              <th className="px-4 py-3 font-medium text-slate-500">Role</th>
              <th className="px-4 py-3 font-medium text-slate-500">Created</th>
              {isSuperAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const role = ROLES.includes(u.role as Role) ? (u.role as Role) : "SUPPORT";
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.email}
                    {isSelf && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">you</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isSuperAdmin && !isSelf ? (
                      <select
                        value={role}
                        onChange={(e) => changeRole(u.id, e.target.value as Role)}
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[role]}`}>
                        {ROLE_LABELS[role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">No admin users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

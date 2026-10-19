"use client";

import { useState } from "react";

type ClinicAssignment = {
  assignmentId: string;
  clinicId: string;
  clinicName: string;
  city: string;
  providerName: string;
};

type FDUser = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  clinics: ClinicAssignment[];
};

type AvailableClinic = {
  id: string;
  clinicName: string;
  city: string;
  providerName: string;
};

type Props = {
  initialUsers: FDUser[];
  availableClinics: AvailableClinic[];
};

export default function FrontDeskStaffClient({ initialUsers, availableClinics }: Props) {
  const [users, setUsers] = useState<FDUser[]>(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Record<string, string>>({});

  async function createUser() {
    setCreating(true); setError("");
    try {
      const res = await fetch("/api/admin/frontdesk-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, name: newName || undefined, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); return; }
      setUsers((prev) => [...prev, { ...data.user, clinics: [] }]);
      setNewEmail(""); setNewName(""); setNewPassword(""); setShowCreate(false);
    } finally {
      setCreating(false);
    }
  }

  async function assignClinic(userId: string) {
    const providerClinicId = selectedClinic[userId];
    if (!providerClinicId) return;
    setAssigning(userId);
    try {
      const res = await fetch(`/api/admin/frontdesk-users/${userId}/clinics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerClinicId }),
      });
      const data = await res.json();
      if (!res.ok) return;
      const clinic = availableClinics.find((c) => c.id === providerClinicId)!;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                clinics: [
                  ...u.clinics,
                  {
                    assignmentId: data.assignment.id,
                    clinicId: clinic.id,
                    clinicName: clinic.clinicName,
                    city: clinic.city,
                    providerName: clinic.providerName,
                  },
                ],
              }
            : u,
        ),
      );
      setSelectedClinic((prev) => ({ ...prev, [userId]: "" }));
    } finally {
      setAssigning(null);
    }
  }

  async function removeClinic(userId: string, clinicId: string) {
    const res = await fetch(`/api/admin/frontdesk-users/${userId}/clinics/${clinicId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, clinics: u.clinics.filter((c) => c.clinicId !== clinicId) } : u,
        ),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-lg bg-[#2f6ea5] px-4 py-2 text-sm font-medium text-white hover:bg-[#265d8e] transition-colors"
        >
          {showCreate ? "Cancel" : "Add front desk user"}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">New front desk user</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                placeholder="frontdesk@caldoc.in" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name (optional)</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Priya Kumar" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password (min 8 chars)</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={createUser} disabled={creating || !newEmail || !newPassword}
            className="rounded-lg bg-[#2f6ea5] px-4 py-2 text-sm font-medium text-white hover:bg-[#265d8e] disabled:opacity-50 transition-colors">
            {creating ? "Creating…" : "Create user"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
            >
              <div>
                <p className="font-medium text-slate-900">{u.name || u.email}</p>
                {u.name && <p className="text-xs text-slate-500">{u.email}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                  {u.clinics.length} {u.clinics.length === 1 ? "clinic" : "clinics"}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === u.id ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {expandedId === u.id && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                {u.clinics.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Assigned clinics</p>
                    {u.clinics.map((c) => (
                      <div key={c.clinicId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{c.clinicName}</p>
                          <p className="text-xs text-slate-500">{c.city} · {c.providerName}</p>
                        </div>
                        <button onClick={() => removeClinic(u.id, c.clinicId)}
                          className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No clinics assigned — this user can see all appointments (same as admin).</p>
                )}

                <div className="flex items-center gap-2">
                  <select
                    value={selectedClinic[u.id] || ""}
                    onChange={(e) => setSelectedClinic((prev) => ({ ...prev, [u.id]: e.target.value }))}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Assign a clinic…</option>
                    {availableClinics
                      .filter((c) => !u.clinics.some((uc) => uc.clinicId === c.id))
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.clinicName} · {c.city} ({c.providerName})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => assignClinic(u.id)}
                    disabled={!selectedClinic[u.id] || assigning === u.id}
                    className="rounded-lg bg-[#2f6ea5] px-3 py-2 text-sm font-medium text-white hover:bg-[#265d8e] disabled:opacity-50 transition-colors"
                  >
                    {assigning === u.id ? "Assigning…" : "Assign"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
            No front desk users yet. Create one above.
          </div>
        )}
      </div>
    </div>
  );
}

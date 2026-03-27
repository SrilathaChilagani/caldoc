"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; email: string; role: string; createdAt: string };

export default function LabTeamClient({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/lab-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add user");
      setUsers((prev) => [{ ...data.user, createdAt: data.user.createdAt }, ...prev]);
      setEmail("");
      setPassword("");
      setSuccess(`${data.user.email} added successfully`);
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this lab user? They will no longer be able to log in.")) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/admin/lab-users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to remove");
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRemovingId(null);
    }
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <>
      {/* Add form */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <h2 className="font-serif text-lg font-semibold text-slate-900">Add lab user</h2>
        <p className="text-sm text-slate-500">
          Create login credentials for a lab team member.
        </p>
        <form onSubmit={handleAdd} className="mt-4 flex flex-wrap gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#2f6ea5] focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/20"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add user"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-2 text-sm text-emerald-600">{success}</p>}
      </section>

      {/* Users list */}
      <section className="rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_4px_24px_-4px_rgba(88,110,132,0.15)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-slate-900">Team members</h2>
          <span className="rounded-full bg-rose-100 px-3 py-0.5 text-xs font-semibold text-rose-700">
            {users.length} member{users.length !== 1 ? "s" : ""}
          </span>
        </div>
        {users.length === 0 ? (
          <p className="text-sm text-slate-400">No lab users yet. Add one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {["Email", "Role", "Added", "Actions"].map((h) => (
                    <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-slate-900">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-400">{formatDate(u.createdAt)}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => handleRemove(u.id)}
                        disabled={removingId === u.id}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {removingId === u.id ? "Removing…" : "Remove"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

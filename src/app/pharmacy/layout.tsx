import Link from "next/link";

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f7ff] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="text-lg font-semibold">Pharmacy Portal</div>
            <form action="/provider/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-700"
              >
                Logout
              </button>
            </form>
        </div>
      </header>
      <main className="px-4 py-10">
        <div className="mx-auto max-w-6xl space-y-6">{children}</div>
      </main>
    </div>
  );
}

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f2ea] text-slate-900">
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}

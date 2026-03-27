export default function PharmacyLoading() {
  return (
    <div className="min-h-screen bg-[#f7f2ea] py-10">
      <div className="mx-auto max-w-5xl space-y-6 px-4">
        <div className="border-b border-slate-200 pb-6">
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-b border-slate-100 py-4">
              <div className="space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

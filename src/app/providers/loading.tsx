export default function ProvidersLoading() {
  return (
    <div className="min-h-screen bg-[#f7f2ea]">
      {/* Search bar skeleton */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="h-10 flex-1 animate-pulse rounded-full bg-slate-200" />
          <div className="h-10 w-32 animate-pulse rounded-full bg-slate-200" />
          <div className="h-10 w-28 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Result count skeleton */}
        <div className="mb-6 h-4 w-40 animate-pulse rounded bg-slate-200" />

        {/* Provider cards grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 flex-shrink-0 animate-pulse rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
                <div className="flex gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-8 w-16 animate-pulse rounded-lg bg-slate-200" />
                  ))}
                </div>
              </div>
              <div className="mt-4 h-9 w-full animate-pulse rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

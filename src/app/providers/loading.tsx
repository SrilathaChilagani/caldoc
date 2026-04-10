export default function ProvidersLoading() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero skeleton — matches the -mt-16 hero */}
      <div className="relative -mt-16 bg-slate-200 animate-pulse" style={{ minHeight: 320 }} />

      <div className="flex items-start mx-6 lg:mx-16 xl:mx-24 mt-6 mb-8">

        {/* Filter sidebar skeleton */}
        <aside className="hidden w-56 shrink-0 lg:block px-5 py-6 space-y-4">
          <div className="h-4 w-20 rounded bg-slate-200 animate-pulse" />
          <div className="space-y-2.5 pt-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="h-3.5 w-3.5 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="pt-4 space-y-2.5">
            <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="h-3.5 w-3.5 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
              </div>
            ))}
          </div>
        </aside>

        {/* Provider list skeleton */}
        <div className="min-w-0 flex-1 bg-gray-100 px-5 py-6 space-y-4">
          <div className="h-4 w-44 rounded bg-slate-200 animate-pulse mb-3" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-slate-200 animate-pulse" />
                {/* Info */}
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-36 rounded bg-slate-200 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-slate-200 animate-pulse" />
                </div>
                {/* Next availability */}
                <div className="shrink-0 flex flex-col items-end gap-3">
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-24 rounded bg-slate-200 animate-pulse" />
                    <div className="h-3.5 w-16 rounded bg-slate-200 animate-pulse" />
                  </div>
                  <div className="h-9 w-28 rounded-xl bg-slate-200 animate-pulse" />
                </div>
              </div>
              {/* Slot calendar */}
              <div className="mt-4 border-t border-slate-100 pt-3 flex gap-2">
                {[...Array(7)].map((_, j) => (
                  <div key={j} className="h-12 w-14 rounded-xl bg-slate-200 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Map skeleton */}
        <div className="hidden lg:block lg:w-[380px] lg:shrink-0">
          <div className="h-screen rounded-xl bg-slate-200 animate-pulse" />
        </div>

      </div>
    </div>
  );
}

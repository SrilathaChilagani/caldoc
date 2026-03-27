export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#f7f2ea] py-10">
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <div className="border-b border-slate-200 pb-6">
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border-b border-slate-100 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-52 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="flex gap-2">
                  <div className="h-7 w-16 animate-pulse rounded-full bg-slate-200" />
                  <div className="h-7 w-16 animate-pulse rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

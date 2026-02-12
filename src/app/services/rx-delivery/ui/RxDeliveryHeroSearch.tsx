"use client";

import { useRouter } from "next/navigation";

export default function RxDeliveryHeroSearch() {
  const router = useRouter();

  const goToSearch = () => {
    router.push("/services/rx-delivery/search");
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        goToSearch();
      }}
      className="rounded-2xl border border-white/40 bg-white/85 p-2 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] flex flex-col sm:flex-row gap-2 max-w-xl"
    >
      <div className="flex-1 relative">
        <svg
          viewBox="0 0 24 24"
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          name="q"
          readOnly
          onFocus={goToSearch}
          onClick={goToSearch}
          placeholder="Search medicines, health products..."
          className="h-12 w-full rounded-xl border-0 bg-white/50 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#2f6ea5]/20"
        />
      </div>
      <button
        type="submit"
        className="h-12 px-6 rounded-xl bg-[#2f6ea5] hover:bg-[#255b8b] text-white font-medium whitespace-nowrap"
      >
        Search
      </button>
    </form>
  );
}

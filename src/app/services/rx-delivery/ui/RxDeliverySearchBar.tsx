"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  label: string;
  type: "medicine" | "composition";
  subtitle?: string;
};

type Props = {
  initialQuery?: string;
  category?: string;
};

export default function RxDeliverySearchBar({ initialQuery = "", category }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (blurTimeout.current) {
      clearTimeout(blurTimeout.current);
      blurTimeout.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/services/rx-delivery/suggestions?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [query]);

  const submitSearch = (value: string) => {
    const q = value.trim();
    if (!q) {
      router.push(
        category
          ? `/services/rx-delivery/search?category=${encodeURIComponent(category)}`
          : "/services/rx-delivery/search",
      );
      return;
    }
    const params = new URLSearchParams({ q });
    if (category) params.set("category", category);
    router.push(`/services/rx-delivery/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitSearch(query);
      }}
      className="mt-8 flex flex-col gap-2 rounded-2xl border border-white/40 bg-white/85 p-2 shadow-[0_25px_60px_-15px_rgba(88,110,132,0.2)] sm:flex-row sm:items-center sm:gap-3 max-w-3xl"
    >
      <div className="relative flex-1">
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
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setOpen(false), 120);
          }}
          placeholder="Search medicines, compositions, dosage..."
          className="h-12 w-full rounded-xl border-0 bg-white/50 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-[#2f6ea5]/20"
        />

        {open && (suggestions.length > 0 || loading) && (
          <div className="absolute left-0 right-0 z-20 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[#e7e0d5] bg-white shadow-lg">
            {loading && (
              <div className="px-3 py-2 text-xs text-slate-500">Searching…</div>
            )}
            {suggestions.map((item) => (
              <button
                type="button"
                key={`${item.type}-${item.label}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(item.label);
                  setOpen(false);
                  submitSearch(item.label);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-800 hover:bg-[#f6f1e9]"
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  {item.subtitle && <p className="text-xs text-slate-500">{item.subtitle}</p>}
                </div>
                <span className="rounded-full bg-[#f2eadf] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#2f6ea5]">
                  {item.type === "composition" ? "Composition" : "Medicine"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        type="submit"
        className="h-12 rounded-xl bg-[#2f6ea5] px-6 font-medium text-white hover:bg-[#255b8b] whitespace-nowrap"
      >
        Search
      </button>
    </form>
  );
}

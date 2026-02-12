"use client";

import { useRouter } from "next/navigation";

type Props = {
  label?: string;
  className?: string;
};

export default function BackButton({ label = "Back", className = "" }: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-[#2f6ea5] ${className}`}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#e7e0d5]">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
      {label}
    </button>
  );
}

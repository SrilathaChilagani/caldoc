"use client";

import { useEffect, useState } from "react";

type Props = {
  label: string;
  className?: string;
  title?: string;
  path?: string;
};

function buildEmbedUrl(path: string) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("embed", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function ProviderScheduleModal({
  label,
  className,
  title = "Manage slots",
  path = "/provider/schedule",
}: Props) {
  const [open, setOpen] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setIframeSrc(buildEmbedUrl(path));
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">{title}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <iframe title={title} src={iframeSrc || path} className="h-[80vh] w-full" />
          </div>
        </div>
      )}
    </>
  );
}

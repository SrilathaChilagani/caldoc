"use client";

import Link from "next/link";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function VisitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-screen -mt-16 bg-gray-100 pt-20 pb-10 px-6 lg:px-16 xl:px-24">
      <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8">
        <h1 className="text-xl font-semibold text-rose-600">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          We couldn&apos;t load your visit details. This is usually a temporary issue.
        </p>
        {error.message && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 break-all">
            {error.message}
          </p>
        )}
        {error.digest && (
          <p className="mt-1 text-xs text-slate-400">Error ID: {error.digest}</p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={reset}
            className="rounded-xl bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b]"
          >
            Try again
          </button>
          <Link
            href="/patient/appointments"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Go to my appointments
          </Link>
        </div>
      </div>
    </main>
  );
}

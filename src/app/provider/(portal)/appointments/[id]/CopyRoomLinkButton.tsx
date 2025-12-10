"use client";

import { useState } from "react";

type Props = {
  link: string;
};

export default function CopyRoomLinkButton({ link }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("copy failed", err);
      setError("Unable to copy");
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center rounded-full border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

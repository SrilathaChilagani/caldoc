"use client";

import { useState } from "react";

export default function FetchRecordingButton({ appointmentId }: { appointmentId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/video/fetch-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed to fetch recording");
      } else if (data.recording) {
        setMsg("Recording saved. Refreshing…");
        // Reload page to show recordingKey
        window.location.reload();
      } else {
        setMsg(data.message || "No recording found yet. Try again later.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error";
      setMsg(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="rounded bg-indigo-600 text-white px-4 py-2 font-medium disabled:opacity-60"
      >
        {loading ? "Checking…" : "Fetch recording"}
      </button>
      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </div>
  );
}

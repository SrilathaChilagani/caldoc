"use client";

import { useState } from "react";

type Props = {
  appointmentId: string;
};

export default function UploadDocumentsForm({ appointmentId }: Props) {
  const [isUploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);

    try {
      setUploading(true);
      setMessage(null);
      const res = await fetch(
        `/api/patient/appointments/${appointmentId}/upload`,
        {
          method: "POST",
          body: form,
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Upload failed");
      }
      setMessage("Uploaded!");
      event.target.value = "";
      window.location.reload();
    } catch (err) {
      setMessage((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 text-sm">
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:border-[#2f6ea5] hover:text-[#2f6ea5]">
        <input
          type="file"
          name="file"
          className="hidden"
          disabled={isUploading}
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          onChange={handleChange}
        />
        {isUploading ? "Uploading…" : "Upload document"}
      </label>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  token: string;
};

export default function UploadClient({ token }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isUploading, setUploading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setError("Choose a document to upload");
      return;
    }

    const formData = new FormData();
    formData.append("token", token);
    formData.append("file", fileInput.files[0]);

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/patient/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Upload failed");
      }

      setSuccess("File uploaded successfully");
      form.reset();
      startTransition(() => router.refresh());
    } catch (err) {
      setError((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <label className="text-sm font-medium text-slate-700">
        Document (PDF, JPG, PNG; max 5 MB)
        <input
          type="file"
          name="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          className="mt-2 block w-full rounded-lg border border-slate-200 p-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={isUploading}
        className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isUploading ? "Uploading…" : "Upload document"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </form>
  );
}

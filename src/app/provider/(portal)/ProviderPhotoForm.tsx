"use client";

import { useState } from "react";
import Image from "next/image";
import { IMAGES } from "@/lib/imagePaths";

type Props = {
  slug: string;
  initialKey?: string | null;
};

export default function ProviderPhotoForm({ slug, initialKey }: Props) {
  const [photoKey, setPhotoKey] = useState(initialKey || null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const photoUrl = photoKey ? `/api/providers/${slug}/photo?v=${encodeURIComponent(photoKey)}` : null;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    try {
      setStatus("uploading");
      setError(null);
      const res = await fetch("/api/provider/profile/photo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Upload failed");
      }
      const data = await res.json().catch(() => ({ key: null }));
      if (data?.key) {
        setPhotoKey(data.key);
      }
      setStatus("success");
      event.target.value = "";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-white">
          {photoUrl ? (
            <Image src={photoUrl} alt="Provider photo" fill className="object-cover" sizes="96px" />
          ) : (
            <Image src={IMAGES.DOC_PLACEHOLDER} alt="Provider placeholder" fill className="object-cover" sizes="96px" />
          )}
        </div>
        <label className="text-sm font-medium text-slate-700">
          <span className="block text-xs uppercase tracking-wide text-slate-500">Profile photo</span>
          <input
            type="file"
            name="photo"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-1 text-xs text-slate-500"
          />
        </label>
      </div>
      {status === "uploading" && <p className="text-xs text-slate-500">Uploading…</p>}
      {status === "success" && <p className="text-xs text-emerald-600">Photo updated.</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <p className="text-[11px] text-slate-400">
        Use a clear headshot (PNG or JPG, under 5 MB). This appears on the public listing.
      </p>
    </div>
  );
}

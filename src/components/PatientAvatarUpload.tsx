"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  photoSrc: string | null;
  initial: string;
};

export default function PatientAvatarUpload({ photoSrc, initial }: Props) {
  const [preview, setPreview] = useState<string | null>(photoSrc);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.set("photo", file);
      await fetch("/api/patient/profile", { method: "POST", body: form });
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Upload profile picture"
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#2f6ea5] flex items-center justify-center text-3xl font-semibold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f6ea5] focus-visible:ring-offset-2"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span className="text-[10px] font-semibold text-white leading-none">
            {uploading ? "Saving…" : "Upload"}
          </span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs font-semibold text-[#2f6ea5] hover:underline disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "Upload picture"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFile}
      />
    </div>
  );
}

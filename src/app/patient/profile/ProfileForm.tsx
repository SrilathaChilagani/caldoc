"use client";

import { useState, FormEvent } from "react";

type Props = {
  initial: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      line2: string;
      city: string;
      state: string;
      postalCode: string;
    };
    photoUrl?: string | null;
  };
};

export default function ProfileForm({ initial }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | undefined | null>(initial.photoUrl);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setError(null);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await fetch("/api/patient/profile", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update profile");
      }
      setStatus("Profile updated");
      if (data.photoUpdated) {
        setPhotoPreview(`/api/patient/profile/photo?ts=${Date.now()}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex w-full flex-col items-start gap-3 md:w-48">
          <div className="h-24 w-24 overflow-hidden rounded-full bg-slate-100">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">No photo</div>
            )}
          </div>
          <label className="text-sm font-medium text-[#2f6ea5] hover:text-[#255b8b]">
            <span>Upload image</span>
            <input
              type="file"
              name="photo"
              accept="image/*"
              className="mt-2 text-xs text-slate-500"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPhotoPreview(URL.createObjectURL(file));
                }
              }}
            />
          </label>
        </div>

        <div className="flex-1 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            First name
            <input
              name="firstName"
              defaultValue={initial.firstName}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Last name
            <input
              name="lastName"
              defaultValue={initial.lastName}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              required
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              name="email"
              defaultValue={initial.email}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              placeholder="you@example.com"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Phone
            <input
              name="phone"
              defaultValue={initial.phone}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
              placeholder="+91 98765 43210 or +1 555 123 4567"
              required
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Address line 1
          <input
            name="line1"
            defaultValue={initial.address.line1}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Address line 2
          <input
            name="line2"
            defaultValue={initial.address.line2}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          City
          <input
            name="city"
            defaultValue={initial.address.city}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          State
          <input
            name="state"
            defaultValue={initial.address.state}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          PIN code
          <input
            name="postalCode"
            defaultValue={initial.address.postalCode}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
          />
        </label>
      </div>

      {status && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-w-[140px] items-center justify-center rounded-full bg-[#2f6ea5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

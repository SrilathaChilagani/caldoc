"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Doc = {
  id: string;
  documentType: string;
  name: string;
  fileType: string;
  fileSizeBytes: number | null;
  createdAt: string;
  downloadUrl: string;
};

const DOC_TYPES = [
  { value: "OFFER_LETTER", label: "Offer letter" },
  { value: "CONTRACT", label: "Employment contract" },
  { value: "ID_PROOF", label: "ID proof" },
  { value: "PAN_CARD", label: "PAN card" },
  { value: "AADHAAR", label: "Aadhaar card" },
  { value: "QUALIFICATION", label: "Qualification certificate" },
  { value: "RELIEVING", label: "Relieving letter" },
  { value: "OTHER", label: "Other" },
];

const DOC_LABELS: Record<string, string> = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPanel({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [docType, setDocType] = useState("OFFER_LETTER");
  const [docName, setDocName] = useState("");

  async function loadDocs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/hr/staff/${employeeId}/documents`);
      if (res.ok) setDocs(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDocs(); }, [employeeId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const name = docName || file.name;
      // 1. Get presigned URL + create DB record
      const metaRes = await fetch(`/api/admin/hr/staff/${employeeId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: docType, name, fileType: file.type, fileSizeBytes: file.size }),
      });
      if (!metaRes.ok) throw new Error((await metaRes.json()).error ?? "Failed to initiate upload");
      const { uploadUrl } = await metaRes.json();

      // 2. PUT the file directly to S3
      const uploadRes = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!uploadRes.ok) throw new Error("S3 upload failed");

      setDocName("");
      if (fileRef.current) fileRef.current.value = "";
      await loadDocs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    setDeleting(docId);
    try {
      await fetch(`/api/admin/hr/staff/${employeeId}/documents/${docId}`, { method: "DELETE" });
      await loadDocs();
    } finally {
      setDeleting(null);
    }
  }

  const fieldClass = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2f6ea5]/30";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Documents</h2>

      {/* Upload form */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Upload document</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <select className={fieldClass} value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <input
            className={fieldClass}
            placeholder="Document name (optional)"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleUpload} disabled={uploading} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-1 rounded-xl bg-[#2f6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#255b8b] disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Choose file"}
            </button>
          </div>
        </div>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>

      {/* Documents list */}
      {loading ? (
        <p className="text-sm text-slate-400 py-4 text-center">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-900">{d.name}</p>
                <p className="text-xs text-slate-400">
                  {DOC_LABELS[d.documentType] ?? d.documentType}
                  {d.fileSizeBytes ? ` · ${fmtSize(d.fileSizeBytes)}` : ""}
                  {" · "}{new Date(d.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={d.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-[#2f6ea5] hover:underline"
                >
                  Download
                </a>
                <button
                  onClick={() => handleDelete(d.id)}
                  disabled={deleting === d.id}
                  className="text-xs font-medium text-rose-500 hover:underline disabled:opacity-50"
                >
                  {deleting === d.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

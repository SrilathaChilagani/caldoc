"use client";

import { useState } from "react";

type Vitals = {
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  heartRate?: number | null;
  temperature?: string | null;
  weightKg?: number | null;
  spo2?: number | null;
};

type FormData = {
  chiefComplaint?: string;
  symptomDuration?: string;
  conditions?: string[];
  conditionsOther?: string;
  currentMedications?: string;
  noMedications?: boolean;
  drugAllergies?: string[];
  drugAllergiesOther?: string;
  foodAllergies?: string;
  environmentalAllergies?: string;
  noKnownAllergies?: boolean;
  smokingStatus?: string;
  alcoholUse?: string;
  currentSymptoms?: string[];
  vitals?: Vitals;
  additionalInfo?: string;
};

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-[#2f6ea5]/8 px-2.5 py-0.5 text-xs font-medium text-[#2f6ea5]">
      {label}
    </span>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

export default function CheckInFormViewer({ appointmentId }: { appointmentId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (formData) { setOpen(true); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/provider/appointments/${appointmentId}/checkin`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load form");
      setFormData(data.formData);
      setCompletedAt(data.completedAt);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  const v = formData?.vitals;
  const hasVitals = v && (v.bpSystolic || v.heartRate || v.temperature || v.weightKg || v.spo2);

  return (
    <div>
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="rounded-full bg-[#2f6ea5] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#255b8b] disabled:opacity-60"
      >
        {loading ? "Loading…" : "View check-in form"}
      </button>
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {open && formData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm">
          <div className="mx-auto my-8 max-w-2xl px-4 pb-10">
            <div className="rounded-2xl border border-white/30 bg-white shadow-2xl">
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">Pre-visit check-in form</h2>
                  {completedAt && (
                    <p className="text-xs text-slate-500">
                      Submitted{" "}
                      {new Date(completedAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <dl className="divide-y divide-slate-100 px-6 py-5 space-y-5">
                {/* Chief complaint */}
                {formData.chiefComplaint && (
                  <div className="pt-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Chief complaint
                    </dt>
                    <dd className="mt-1 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-slate-800">
                      {formData.chiefComplaint}
                    </dd>
                    {formData.symptomDuration && (
                      <dd className="mt-1 text-xs text-slate-500">Duration: {formData.symptomDuration}</dd>
                    )}
                  </div>
                )}

                {/* Current symptoms */}
                {formData.currentSymptoms && formData.currentSymptoms.length > 0 && (
                  <div className="pt-4">
                    <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current symptoms
                    </dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {formData.currentSymptoms.map((s) => (
                        <Chip key={s} label={s} />
                      ))}
                    </dd>
                  </div>
                )}

                {/* Medical history */}
                {((formData.conditions && formData.conditions.length > 0) || formData.conditionsOther) && (
                  <div className="pt-4">
                    <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Medical history
                    </dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {(formData.conditions || []).map((c) => (
                        <Chip key={c} label={c} />
                      ))}
                      {formData.conditionsOther && <Chip label={formData.conditionsOther} />}
                    </dd>
                  </div>
                )}

                {/* Medications */}
                <div className="pt-4">
                  {formData.noMedications ? (
                    <Row label="Current medications" value="None (patient confirmed)" />
                  ) : formData.currentMedications ? (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Current medications
                      </dt>
                      <dd className="mt-1 whitespace-pre-line rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-800">
                        {formData.currentMedications}
                      </dd>
                    </div>
                  ) : null}
                </div>

                {/* Allergies */}
                <div className="pt-4 space-y-2">
                  {formData.noKnownAllergies ? (
                    <Row label="Allergies" value="No known drug allergies (NKDA)" />
                  ) : (
                    <>
                      {formData.drugAllergies && formData.drugAllergies.length > 0 && (
                        <div>
                          <dt className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Drug allergies
                          </dt>
                          <dd className="flex flex-wrap gap-1.5">
                            {formData.drugAllergies.map((a) => (
                              <span
                                key={a}
                                className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700"
                              >
                                {a}
                              </span>
                            ))}
                            {formData.drugAllergiesOther && (
                              <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                                {formData.drugAllergiesOther}
                              </span>
                            )}
                          </dd>
                        </div>
                      )}
                      <Row label="Food allergies" value={formData.foodAllergies} />
                      <Row label="Environmental allergies" value={formData.environmentalAllergies} />
                    </>
                  )}
                </div>

                {/* Lifestyle */}
                <div className="pt-4 grid gap-3 sm:grid-cols-2">
                  <Row
                    label="Smoking"
                    value={
                      formData.smokingStatus === "never"
                        ? "Never smoked"
                        : formData.smokingStatus === "former"
                        ? "Former smoker"
                        : formData.smokingStatus === "current"
                        ? "Current smoker"
                        : undefined
                    }
                  />
                  <Row
                    label="Alcohol"
                    value={
                      formData.alcoholUse === "none"
                        ? "None"
                        : formData.alcoholUse === "occasional"
                        ? "Occasional"
                        : formData.alcoholUse === "regular"
                        ? "Regular"
                        : undefined
                    }
                  />
                </div>

                {/* Vitals */}
                {hasVitals && (
                  <div className="pt-4">
                    <dt className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Patient-reported vitals
                    </dt>
                    <dd className="grid gap-2 sm:grid-cols-3">
                      {v?.bpSystolic && v?.bpDiastolic && (
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                          <p className="text-xs text-slate-500">Blood pressure</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {v.bpSystolic}/{v.bpDiastolic} mmHg
                          </p>
                        </div>
                      )}
                      {v?.heartRate && (
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                          <p className="text-xs text-slate-500">Heart rate</p>
                          <p className="text-sm font-semibold text-slate-900">{v.heartRate} bpm</p>
                        </div>
                      )}
                      {v?.temperature && (
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                          <p className="text-xs text-slate-500">Temperature</p>
                          <p className="text-sm font-semibold text-slate-900">{v.temperature}</p>
                        </div>
                      )}
                      {v?.weightKg && (
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                          <p className="text-xs text-slate-500">Weight</p>
                          <p className="text-sm font-semibold text-slate-900">{v.weightKg} kg</p>
                        </div>
                      )}
                      {v?.spo2 && (
                        <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                          <p className="text-xs text-slate-500">SpO₂</p>
                          <p className="text-sm font-semibold text-slate-900">{v.spo2}%</p>
                        </div>
                      )}
                    </dd>
                  </div>
                )}

                {/* Additional info */}
                {formData.additionalInfo && (
                  <div className="pt-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Additional notes from patient
                    </dt>
                    <dd className="mt-1 whitespace-pre-line rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-800">
                      {formData.additionalInfo}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

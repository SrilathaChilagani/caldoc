/**
 * Renders a transparent "fulfilled by" attribution card for regulated services.
 * Keeps CalDoc as the orchestration layer while clearly naming the executing partner.
 * Used on lab order detail, rx order review, and scheduling pages.
 */

type LabPartner = {
  name: string;
  city?: string | null;
  state?: string | null;
  nablCertified?: boolean;
  nablCertNumber?: string | null;
};

type PharmacyPartner = {
  name: string;
  city?: string | null;
  state?: string | null;
  drugLicenseNumber?: string | null;
};

type Props =
  | { type: "lab"; partner: LabPartner | null }
  | { type: "pharmacy"; partner: PharmacyPartner | null };

function LocationChip({ city, state }: { city?: string | null; state?: string | null }) {
  const parts = [city, state].filter(Boolean);
  if (!parts.length) return null;
  return (
    <span className="text-xs text-slate-500">
      {parts.join(", ")}
    </span>
  );
}

export default function PartnerDisclosureCard(props: Props) {
  if (props.type === "lab") {
    const p = props.partner;
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Diagnostics
        </p>
        {p ? (
          <>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold text-slate-800">{p.name}</span>
              <LocationChip city={p.city} state={p.state} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.nablCertified && (
                <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                  NABL Accredited
                </span>
              )}
              {p.nablCertNumber && (
                <span className="text-xs text-slate-500">
                  Cert no. {p.nablCertNumber}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Your samples are collected and processed by{" "}
              <span className="font-medium text-slate-700">{p.name}</span>, an accredited
              diagnostics partner on the CalDoc network. CalDoc coordinates your care; {p.name} performs the tests.
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-700">
              Accredited diagnostics partner
            </p>
            <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
              Your samples will be collected and processed by a CalDoc-accredited diagnostics
              partner. Partner details will appear here once your order is confirmed.
            </p>
          </>
        )}
      </div>
    );
  }

  // Pharmacy
  const p = props.partner;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Medication fulfillment
      </p>
      {p ? (
        <>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-slate-800">{p.name}</span>
            <LocationChip city={p.city} state={p.state} />
          </div>
          {p.drugLicenseNumber && (
            <p className="mt-1 text-xs text-slate-500">
              Drug Licence: {p.drugLicenseNumber}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Your prescription is dispensed and delivered by{" "}
            <span className="font-medium text-slate-700">{p.name}</span>, a licensed
            pharmacy partner on the CalDoc network. CalDoc coordinates your order; {p.name} dispenses your medicines.
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-700">
            Licensed pharmacy partner
          </p>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            Your prescription will be dispensed by a CalDoc-licensed pharmacy partner.
            Partner details will appear here once your order is assigned.
          </p>
        </>
      )}
    </div>
  );
}

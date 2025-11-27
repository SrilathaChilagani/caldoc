import Link from "next/link";

type DisclaimerNoticeProps = {
  variant?: "banner" | "inline";
  className?: string;
};

const baseCopy = "Not for emergencies. In an emergency, contact your local services or visit the nearest hospital.";

export default function DisclaimerNotice({ variant = "inline", className = "" }: DisclaimerNoticeProps) {
  if (variant === "banner") {
    return (
      <div className={`bg-amber-50 border-y border-amber-200 text-xs sm:text-sm text-amber-900 ${className}`}>
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
          <span>{baseCopy}</span>
          <Link href="/disclaimer" className="font-semibold underline underline-offset-2">
            Read full disclaimer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 sm:text-sm ${className}`}>
      <div className="font-medium text-amber-900">Teleconsultation disclaimer</div>
      <p className="mt-1 text-[13px] leading-relaxed text-amber-900/90">
        {baseCopy} TELEMEDICINE has limitations and may require in-person evaluation based on the provider&apos;s judgement.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-amber-900">
        <Link href="/disclaimer" className="underline">
          View detailed terms
        </Link>
        <Link href="/compliance" className="underline">
          DPDP compliance summary
        </Link>
      </div>
    </div>
  );
}

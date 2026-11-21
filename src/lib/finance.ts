// Finance helpers: GST calculation, TDS (Section 194J), invoice numbering

/** GST rate on telehealth platform fee: 18% */
export const GST_RATE = 0.18;
/** SAC code for online consulting/telemedicine platform services */
export const PLATFORM_SAC = "998314";
/** TDS Section 194J threshold per financial year (paise) */
export const TDS_194J_THRESHOLD_PAISE = 3_000_000; // ₹30,000
/** TDS rate under Section 194J for professional fees */
export const TDS_194J_RATE = 0.10;

/** Get Indian financial year string for a date, e.g. "2026-27" */
export function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  const fyStart = month >= 4 ? year : year - 1;
  return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
}

/** Split an amount into CGST + SGST (intra-state) or IGST (inter-state).
 *  For simplicity CalDoc assumes intra-state (same state) for all platform fees. */
export function computeGst(amountPaise: number): {
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalGstPaise: number;
} {
  const totalGstPaise = Math.round(amountPaise * GST_RATE);
  const halfGst = Math.floor(totalGstPaise / 2);
  return {
    cgstPaise: halfGst,
    sgstPaise: totalGstPaise - halfGst,
    igstPaise: 0,
    totalGstPaise,
  };
}

/** Compute TDS to deduct on a payout given the cumulative gross paid this FY.
 *  TDS kicks in once cumulative gross >= ₹30,000. */
export function computeTds(params: {
  payoutAmtPaise: number;
  cumulativeGrossPaiseSoFar: number;
}): number {
  const { payoutAmtPaise, cumulativeGrossPaiseSoFar } = params;
  if (cumulativeGrossPaiseSoFar + payoutAmtPaise <= TDS_194J_THRESHOLD_PAISE) return 0;
  if (cumulativeGrossPaiseSoFar >= TDS_194J_THRESHOLD_PAISE) {
    // Already over threshold — deduct on full amount
    return Math.round(payoutAmtPaise * TDS_194J_RATE);
  }
  // Threshold crossed mid-payout
  const taxableAmt = cumulativeGrossPaiseSoFar + payoutAmtPaise - TDS_194J_THRESHOLD_PAISE;
  return Math.round(taxableAmt * TDS_194J_RATE);
}

/** Format paise as Indian rupee string (e.g. 150000 → "₹1,500") */
export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

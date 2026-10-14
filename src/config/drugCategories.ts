// ══════════════════════════════════════════════════════════════════════════════
// CLINICAL CONFIGURATION — Drug category rules for telemedicine prescriptions.
//
// Framework: Telemedicine Practice Guidelines 2020 (MoHFW / NMC)
//            Drugs and Cosmetics Act, 1940 (for Schedule X)
//
// HOW TO MAINTAIN (no component code changes needed):
//   • To change whether a category is prescribable via telemedicine, update
//     `prescribableViaTelemed` on the relevant entry below.
//   • Do NOT change `value` fields — they are stored in the database and
//     renaming them is a data migration, not a config change.
//   • After any material change, have the update reviewed by your
//     legal/clinical compliance advisor before deploying.
//
// PENDING ENFORCEMENT — documented here so the gap is visible, not silent:
//   1. List B "follow-up only" rule (requiresFollowUp: true):
//      TPG 2020 restricts List B to follow-up consultations where the patient
//      has a prior in-person diagnosis. The Appointment model does not yet have
//      a first-consultation / follow-up distinction.
//      TODO: once Appointment.isFollowUp exists, enforce requiresFollowUp in
//      the prescription API and block List B on first-consultation appointments.
//      Requires compliance review before implementing enforcement.
//
//   2. Video-first requirement for initial consultations:
//      TPG 2020 recommends video (not audio-only) for first-time clinical
//      assessments. Currently CalDoc does not enforce this per booking mode.
//      TODO: requires compliance review before implementing enforcement.
// ══════════════════════════════════════════════════════════════════════════════

export const DRUG_CATEGORY_VALUES = [
  "OTC",
  "LIST_O",
  "LIST_A",
  "LIST_B",
  "SCHEDULE_X",
] as const;

export type DrugCategory = (typeof DRUG_CATEGORY_VALUES)[number];

export interface DrugCategoryRule {
  /** Database-stored value — do not rename without a data migration */
  value: DrugCategory;
  /** Short label for the doctor-facing prescription form dropdown */
  label: string;
  /** Exact category name as used in TPG 2020 */
  tpgLabel: string;
  /** Whether this category may be submitted via the telemedicine prescription API */
  prescribableViaTelemed: boolean;
  /**
   * When true, TPG 2020 restricts this category to follow-up consultations only.
   * Currently informational — enforcement is pending (see TODOs above).
   */
  requiresFollowUp: boolean;
  /** Patient-facing / compliance-page description of the rule */
  complianceNote: string;
}

export const DRUG_CATEGORY_RULES: readonly DrugCategoryRule[] = [
  {
    value: "OTC",
    label: "OTC (general)",
    tpgLabel: "OTC",
    prescribableViaTelemed: true,
    requiresFollowUp: false,
    complianceNote:
      "Over-the-counter medicines. May be recommended for any patient, first-time or follow-up, without a formal prescription document.",
  },
  {
    value: "LIST_O",
    label: "List O",
    tpgLabel: "List O (TPG 2020)",
    prescribableViaTelemed: true,
    requiresFollowUp: false,
    complianceNote:
      "TPG 2020 List O. Equivalent to OTC for telemedicine purposes; can be advised without a separate prescription.",
  },
  {
    value: "LIST_A",
    label: "List A",
    tpgLabel: "List A (TPG 2020)",
    prescribableViaTelemed: true,
    requiresFollowUp: false,
    complianceNote:
      "TPG 2020 List A. Prescribable via telemedicine for first-time or follow-up consultations. A valid digital prescription must be issued and provided to the patient.",
  },
  {
    value: "LIST_B",
    label: "List B",
    tpgLabel: "List B (TPG 2020)",
    prescribableViaTelemed: true,
    requiresFollowUp: true,
    complianceNote:
      "TPG 2020 List B. Prescribable via telemedicine only in follow-up consultations where the patient has a prior in-person diagnosis. RMP clinical discretion applies. Note: platform enforcement of the follow-up restriction is planned for a future release.",
  },
  {
    value: "SCHEDULE_X",
    label: "Schedule X (controlled)",
    tpgLabel: "Schedule X",
    prescribableViaTelemed: false,
    requiresFollowUp: false,
    complianceNote:
      "Narcotic, psychotropic, and other controlled substances under the NDPS Act and Drugs & Cosmetics Act. Cannot be prescribed via telemedicine under any circumstances per TPG 2020. In-person consultation is mandatory.",
  },
];

/**
 * Categories that may be submitted to the prescription API.
 * Schedule X is excluded — it cannot be prescribed via telemedicine.
 * Cast to a non-empty tuple for Zod z.enum() compatibility.
 */
export const PRESCRIBABLE_CATEGORY_VALUES = DRUG_CATEGORY_RULES
  .filter((r) => r.prescribableViaTelemed)
  .map((r) => r.value) as [DrugCategory, ...DrugCategory[]];

/** Lookup a rule by its stored value. */
export function getDrugCategoryRule(value: DrugCategory): DrugCategoryRule | undefined {
  return DRUG_CATEGORY_RULES.find((r) => r.value === value);
}

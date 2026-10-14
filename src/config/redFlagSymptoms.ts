// ══════════════════════════════════════════════════════════════════════════════
// CLINICAL CONFIGURATION — Red-flag symptom rules.
//
// This is the single source of truth for all red-flag symptom detection across
// the CalDoc platform (booking, urgent consultation, symptom search, etc.).
//
// HOW TO MAINTAIN (no component code changes needed):
//   • To ADD a new red-flag symptom: add an entry to RED_FLAG_RULES.
//   • To REMOVE one: delete its entry.
//   • To ADD a booking symptom: append to BOOKING_SYMPTOMS.
//   • To ADD an urgent consultation symptom: append to URGENT_SYMPTOMS.
//   After editing, redeploy the application.
//
// CLINICAL NOTE (India Telemedicine Practice Guidelines 2020):
//   Life-threatening conditions must not be managed via teleconsultation.
//   Patients with the symptoms below must be directed to emergency services (112)
//   or the nearest hospital ER without delay.
// ══════════════════════════════════════════════════════════════════════════════

export interface RedFlagRule {
  /** Patient-facing symptom name shown in triage UI and warning banners */
  symptom: string;
  /** Lowercase keyword fragments used for free-text detection (partial match, case-insensitive) */
  keywords: readonly string[];
}

// ── Red-flag rules ────────────────────────────────────────────────────────────

export const RED_FLAG_RULES: readonly RedFlagRule[] = [
  {
    symptom: "Chest pain or pressure",
    keywords: ["chest pain", "chest pressure", "chest tightness", "heart pain", "chest discomfort"],
  },
  {
    symptom: "Severe difficulty breathing",
    keywords: [
      "can't breathe", "cannot breathe", "difficulty breathing",
      "shortness of breath", "breathless", "choking", "not breathing",
    ],
  },
  {
    symptom: "Loss of consciousness",
    keywords: [
      "unconscious", "fainted", "passed out", "unresponsive",
      "collapsed", "collapse", "not waking", "won't wake",
    ],
  },
  {
    symptom: "Suspected stroke",
    keywords: [
      "stroke", "face drooping", "facial droop", "arm weakness",
      "slurred speech", "sudden numbness", "sudden vision loss", "sudden severe headache",
    ],
  },
  {
    symptom: "Severe uncontrolled bleeding",
    keywords: [
      "severe bleeding", "uncontrolled bleeding", "heavy bleeding",
      "bleeding won't stop", "blood loss", "hemorrhage",
    ],
  },
  {
    symptom: "Severe allergic reaction (anaphylaxis)",
    keywords: [
      "anaphylaxis", "throat swelling", "tongue swelling", "face swelling",
      "lips swelling", "can't swallow", "severe allergic",
    ],
  },
  {
    symptom: "Suspected poisoning or overdose",
    keywords: [
      "overdose", "poisoning", "swallowed poison", "took too many",
      "ingested chemicals", "drug overdose",
    ],
  },
];

// ── Derived exports ────────────────────────────────────────────────────────────

/** Display names for all red-flag symptoms — use in triage UI exclude-lists */
export const RED_FLAG_SYMPTOMS: readonly string[] = RED_FLAG_RULES.map((r) => r.symptom);

// ── Safe symptom lists ────────────────────────────────────────────────────────

/**
 * Symptoms appropriate for the urgent teleconsultation booking form.
 * Red-flag conditions (chest pain, breathing difficulty, etc.) are intentionally absent.
 */
export const URGENT_SYMPTOMS: readonly string[] = [
  "Fever",
  "Headache",
  "Dizziness",
  "Abdominal pain",
  "Sore throat",
  "Cough",
  "Ear pain",
  "Rash or skin irritation",
  "Cold / Runny nose",
  "Nausea",
  "Fatigue / Weakness",
];

/**
 * Symptoms for the regular doctor booking form (step 2 symptom picker).
 * A broader list than URGENT_SYMPTOMS — still excludes all red-flag conditions.
 */
export const BOOKING_SYMPTOMS: readonly string[] = [
  "Fever",
  "Headache",
  "Dizziness",
  "Sore throat",
  "Cough",
  "Cold",
  "Abdominal pain",
  "Ear pain",
  "Rash",
  "Nausea",
  "Back pain",
  "Joint pain",
  "Fatigue",
];

// ── Detection utility ─────────────────────────────────────────────────────────

/**
 * Scans free text (notes, "other symptom" field, AI output) for red-flag keywords.
 * Returns the symptom display names of any rules triggered.
 *
 * @example
 *   detectRedFlagsInText("I have chest pain and dizziness")
 *   // → ["Chest pain or pressure"]
 */
export function detectRedFlagsInText(text: string): string[] {
  if (!text.trim()) return [];
  const lower = text.toLowerCase();
  return RED_FLAG_RULES
    .filter((rule) => rule.keywords.some((kw) => lower.includes(kw)))
    .map((rule) => rule.symptom);
}

/**
 * Returns true if any item in `symptoms` is in the red-flag list.
 * For use with explicit symptom pickers (where symptom names are exact matches).
 */
export function hasRedFlagSymptom(symptoms: readonly string[]): boolean {
  const flagSet = new Set(RED_FLAG_SYMPTOMS);
  return symptoms.some((s) => flagSet.has(s));
}

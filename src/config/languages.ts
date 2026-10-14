// ── Language configuration ────────────────────────────────────────────────────
// Single source of truth for all supported language codes and display names.
// To add a new language: append to LANGUAGE_CODES and redeploy.

export const LANGUAGE_CODES = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  te: "Telugu",
  mr: "Marathi",
  ta: "Tamil",
  ur: "Urdu",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  or: "Odia",
  pa: "Punjabi",
  as: "Assamese",
} as const;

export type LanguageCode = keyof typeof LANGUAGE_CODES;

/** Dropdown/filter options ordered by code. */
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = Object.entries(
  LANGUAGE_CODES,
).map(([value, label]) => ({ value, label }));

/**
 * Converts a stored language value to a patient-friendly display name.
 * Handles:
 *   - 2-letter codes:    "ml"        → "Malayalam"
 *   - Full stored names: "Malayalam" → "Malayalam"  (from self-enrollment form)
 *   - Unknown values:    capitalises first letter as a safe fallback
 */
export function formatLanguage(code: string): string {
  const lower = code.trim().toLowerCase();

  // Match against known 2-letter codes
  if (lower in LANGUAGE_CODES) {
    return LANGUAGE_CODES[lower as LanguageCode];
  }

  // Match against full display names stored by the enrollment form
  const byName = Object.values(LANGUAGE_CODES).find(
    (name) => name.toLowerCase() === lower,
  );
  if (byName) return byName;

  // Graceful fallback: capitalise
  return code.charAt(0).toUpperCase() + code.slice(1);
}

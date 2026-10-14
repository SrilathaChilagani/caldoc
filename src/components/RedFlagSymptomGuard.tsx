"use client";

import { useMemo } from "react";
import { detectRedFlagsInText, hasRedFlagSymptom } from "@/config/redFlagSymptoms";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RedFlagGuardResult {
  /** True when at least one red-flag condition was detected */
  isBlocked: boolean;
  /** Display names of the triggered red-flag rules */
  triggeredSymptoms: string[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Detects red-flag conditions from a symptom picker selection and/or free text.
 * Use this hook when you need the detection result to drive custom UI.
 *
 * @example
 *   const { isBlocked, triggeredSymptoms } = useRedFlagGuard(selectedSymptoms, otherSymptomText);
 *   // disable submit button when isBlocked === true
 */
export function useRedFlagGuard(
  selectedSymptoms: readonly string[] = [],
  freeText = "",
): RedFlagGuardResult {
  return useMemo(() => {
    const fromPicker = selectedSymptoms.filter((s) =>
      // re-use the same config check so both paths stay in sync
      hasRedFlagSymptom([s])
    );
    const fromText = detectRedFlagsInText(freeText);

    const all = [...new Set([...fromPicker, ...fromText])];
    return { isBlocked: all.length > 0, triggeredSymptoms: all };
  }, [selectedSymptoms, freeText]);
}

// ── Banner component ──────────────────────────────────────────────────────────

interface RedFlagBannerProps {
  triggeredSymptoms: string[];
  /** Extra Tailwind classes for layout adjustments */
  className?: string;
}

/**
 * Inline safety banner shown when a red-flag condition is detected.
 * Non-modal — renders in-flow so it doesn't block the user from reading the message.
 *
 * @example
 *   <RedFlagBanner triggeredSymptoms={triggeredSymptoms} />
 */
export function RedFlagBanner({ triggeredSymptoms, className = "" }: RedFlagBannerProps) {
  if (triggeredSymptoms.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-2xl border-2 border-rose-400 bg-rose-50 p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-rose-600">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-rose-900">
            These symptoms may require emergency care
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {triggeredSymptoms.map((s) => (
              <li key={s} className="flex items-center gap-1.5 text-sm text-rose-800">
                <span aria-hidden="true">·</span> {s}
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-sm text-rose-800">
            Teleconsultation is <strong>not appropriate</strong> for life-threatening conditions.
            Please call emergency services or go to your nearest hospital immediately.
          </p>

          <a
            href="tel:112"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.18 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
            </svg>
            Call 112 — National Emergency
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Full guard wrapper ────────────────────────────────────────────────────────

interface RedFlagSymptomGuardProps {
  /**
   * Symptoms explicitly selected from a picker.
   * Red-flag symptoms should not appear in normal booking pickers, but this
   * provides a safety net if the list ever drifts.
   */
  selectedSymptoms?: readonly string[];
  /**
   * Free text from any input field (notes, "other symptom", search query).
   * Scanned for red-flag keywords.
   */
  freeText?: string;
  /**
   * Content to render below the banner (the rest of the form, CTA buttons, etc.).
   * When isBlocked is true, children are still rendered but with aria-hidden so
   * screen readers focus on the warning — the parent should also disable submit.
   */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Wraps any symptom-selection area. Automatically shows a red-flag safety banner
 * when a dangerous condition is detected from the picker or free text.
 *
 * The banner is rendered *above* children so it's the first thing seen.
 * The parent is responsible for disabling form submission when `isBlocked` is true
 * (use the `useRedFlagGuard` hook for that).
 *
 * @example
 *   <RedFlagSymptomGuard freeText={otherSymptom} selectedSymptoms={selectedSymptoms}>
 *     <button disabled={isBlocked}>Proceed to payment</button>
 *   </RedFlagSymptomGuard>
 */
export function RedFlagSymptomGuard({
  selectedSymptoms = [],
  freeText = "",
  children,
  className = "",
}: RedFlagSymptomGuardProps) {
  const { triggeredSymptoms } = useRedFlagGuard(selectedSymptoms, freeText);

  return (
    <div className={className}>
      <RedFlagBanner triggeredSymptoms={triggeredSymptoms} className={triggeredSymptoms.length > 0 ? "mb-4" : ""} />
      {children}
    </div>
  );
}

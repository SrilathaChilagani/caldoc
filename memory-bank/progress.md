# Progress

> Source of truth for project status. Update at the end of every session.
> Seeded from `docs/pm/LAUNCH_BACKLOG.md` + `docs/sprints/SPRINT_01.md` + codebase. Verify ✅ items by running them.

## ✅ Done / Working (per docs — verify)
- Core platform exists: booking, checkout, video room, patient/provider/admin/frontdesk/ngo/lab/pharmacy portals.
- Sprint 01 perf wins: heavy image optimization; provider photo streaming + cache.
- Integrations wired in `src/lib`: Razorpay, Daily.co video, Twilio Verify, WhatsApp, Exotel, S3.
- Enrollment flows for providers/pharmacies/labs.
- Test scaffolding: Vitest unit tests (`src/lib/__tests__`), Playwright e2e (`e2e/`).
- Sentry monitoring + backups (`backups/`).
- Memory-bank + agent rules set up.
- **Architecture review + foundational question resolution (2026-06-29).**
- **Fixed: cleanup-abandoned-bookings cron (POST→GET — was never running).**
- **Fixed: reminder cron schedule (hourly — was missing ~95% of appointments).**
- **Fixed: lab order status update ownership check (cross-partner leak closed).**
- **Fixed: patient session cookie `secure` flag in production.**
- **Fixed: Payment.updatedAt missing `@updatedAt` directive.**
- Middleware pass-through confirmed intentional and safe (App Router per-handler auth).
- 4 foundational questions resolved (isolation, middleware, queue, compliance).

## ✅ Done (added 2026-06-30)
- **Booking page UX rewrite:** single-page flow — prescription delivery moved to left column below Visit Type; right sidebar shows live booking summary (Doctor, Slot, Patient, Visit, Delivery, Fee); "Proceed to payment" button goes directly to `/checkout` without a confirmation page.

## ✅ Done (added 2026-07-29)
- **Pharmacy end-to-end flow:** Onboarding now auto-creates `PharmacyUser` (linked by `pharmacyPartnerId`) with temp password and WhatsApp notification. Duplicate email/drug-license detection added. Login uses pure DB auth (env whitelist removed). Pharmacy portal scopes Rx orders to logged-in partner. Rx delivery orders auto-assigned to matching pharmacy by delivery postal code. Payment confirmation notifies the assigned pharmacy's WhatsApp. Sign-out properly clears session cookie via new `/api/pharmacy/logout` route.
- **Labs end-to-end flow + Lab CRM:** Same fixes applied to labs — onboarding auto-creates `LabUser` with `labPartnerId`, temp password, WhatsApp notification, duplicate email detection. Login env whitelist removed (pure DB auth). Labs-at-home orders auto-assign first active `homeCollection: true` lab partner. Payment confirmation notifies assigned lab partner phone. Results upload now saves `resultsPdfKey` on `LabOrder` and WhatsApp-notifies patient + prescribing doctor. New lab CRM detail page (`/labs/orders/[id]`) with step-by-step workflow, agent assignment, results upload. Patient portal shows "Download results" button. Schema migration: `resultsPdfKey String?` added to `LabOrder`.

## ✅ Done (added 2026-10-12)
- **Production-hardening audit (ChatGPT / self-review):**
  - `src/lib/cronAuth.ts` — centralised CRON_SECRET auth helper; rejects unset secret and "dev-please-change" placeholder in production; used by all 6 cron routes.
  - `src/app/api/provider/calendar/route.ts` — 90-day max date range guard.
  - `src/app/api/providers/search/route.ts` — removed unused `feePaise` from slots select.
  - `src/app/api/appointments/emergency/route.ts` — added `export const maxDuration = 30`.
  - Structured logging: `Sentry.captureMessage("info")` on every payment capture in `checkout/confirm/route.ts` and `webhooks/razorpay/route.ts`; all fire-and-forget `.catch()` handlers call `Sentry.captureException`.
  - API route unit tests: `checkout/__tests__/confirm.test.ts` (9 tests), `appointments/__tests__/create.test.ts` (7 tests), `webhooks/__tests__/razorpay.test.ts` (9 tests).
- **Emergency flow safety redesign (P0 compliance):**
  - `src/app/emergency/page.tsx` — renamed to "Urgent Consultation", 3-state triage flow (triage → emergency → form), `RED_FLAG_SYMPTOMS` list (chest pain, breathing difficulty, stroke, etc.) triggers safety routing to 112, `URGENT_SYMPTOMS` list for booking form, prominent `<a href="tel:112">` call-to-action.
  - `src/app/emergency/confirmed/[id]/page.tsx` — "emergency consultation" → "urgent consultation", "Emergency — Pending" → "Urgent — Pending".
  - `src/app/page.tsx` — homepage button "Emergency Appointment" → "Urgent Consultation".

## 🚧 In Progress
- Sprint 01: production-readiness checklist.

## 🐞 Broken / Known Issues
- `generate-slots` cron creates slots at UTC times (09:00–17:00 UTC = 14:30–22:30 IST) — should use IST offset. (P1)
- Razorpay webhook silently ignores Rx/Lab order payments — only client-side confirm works for those flows. (P1)
- AuditLog model under-used — sensitive actions (login, payment, status change) not consistently logged. (P1)
- Error handling not consistent across all API routes. (P0)
- Vercel Pro plan required for hourly reminder cron (`0 * * * *`) — confirm plan before deploy. (blocker)
- No password-change or forgot-password flow for pharmacy or lab users. (P1)
- Labs: no `serviceAreas` on `LabPartner` — routing uses first active homeCollection lab. Multi-lab postal code matching not yet implemented. (P1)
- `LABS_ALLOWED_EMAILS` + `LABS_PORTAL_DEFAULT_PASSWORD` env vars now unused — remove from prod. (housekeeping)

## 📋 Next Up (P0 first)
- [ ] **P0:** End-to-end booking → payment → consultation test pass
- [ ] **P0:** Error-handling consistency across all API routes
- [ ] **P0:** Production env checklist + secrets audit (CRON_SECRET, RZP_WEBHOOK_SECRET, JWT_SECRET all set?)
- [ ] **P0:** Monitoring/alerts baseline (Sentry + health checks)
- [ ] **P0:** Ensure `CRON_SECRET` is set in GitHub repo secrets (needed by `cron-jobs.yml`)
- [ ] Auth/session hardening for patient/provider/admin
- [ ] Perf pass for homepage / providers / booking / checkout
- [ ] (P1) Fix slot timezone: generate-slots should use IST (+05:30) offsets
- [ ] (P1) Razorpay webhook: handle Rx/Lab order payment.captured events
- [ ] (P1) AuditLog: write on login, payment capture, appointment status change
- [ ] (P1) OTP rate limiting on /api/patient/login/request-otp
- [ ] (P1) Provider listing search/filter query optimization

## 🧱 Milestones
- [ ] **M1:** Production-ready v1 (booking+checkout reliable, portals stable, perf, ops readiness).

---
## ✅ Done (added 2026-10-12 — red-flag safety layer)
- **`src/config/redFlagSymptoms.ts`** — single clinical config file. Exports `RED_FLAG_RULES` (with keyword arrays for free-text detection), `RED_FLAG_SYMPTOMS`, `URGENT_SYMPTOMS`, `BOOKING_SYMPTOMS`, `detectRedFlagsInText()`, `hasRedFlagSymptom()`. Clinical team edits this file; no component code changes needed.
- **`src/components/RedFlagSymptomGuard.tsx`** — reusable safety layer. Exports `useRedFlagGuard(selectedSymptoms, freeText)` hook, `RedFlagBanner` component, `RedFlagSymptomGuard` wrapper. Works across booking, urgent consultation, future symptom search.
- **`src/app/book/[providerId]/ui/BookClient.tsx`** — removed "Chest pain" from symptom picker (`SYMPTOM_OPTIONS` → `BOOKING_SYMPTOMS` from config). Added `useRedFlagGuard` to monitor "Other" free-text field. Wired `RedFlagBanner` above symptom section; "Proceed to payment" button disabled when guard is triggered. Added persistent amber callout: "For chest pain… call 112 or Urgent Consultation".
- **`src/app/emergency/page.tsx`** — replaced inline `RED_FLAG_SYMPTOMS`/`URGENT_SYMPTOMS` constants with imports from config.

## ✅ Done (added 2026-10-13 — language display fix + status labels)
- **`src/config/languages.ts`** — new single source of truth. `LANGUAGE_CODES` map (all 13 Indian languages: en→English through as→Assamese), `LANGUAGE_OPTIONS` array for dropdowns/filters, `formatLanguage(code)` that handles 2-letter codes, full stored names, and unknown values gracefully.
- **`src/app/providers/ProvidersClient.tsx`** — removed local 7-language `languageLabels` map; imports `formatLanguage` + `LANGUAGE_OPTIONS`; provider card and search summary use `formatLanguage`; language filter sidebar now shows all 13 languages (was 7).
- **`src/app/book/[providerId]/ui/BookClient.tsx`** — removed inline 7-language map; uses `formatLanguage` from config.
- **`src/app/page.tsx`** — removed local `languageLabels` + `formatLanguage`; imports from config.
- **`src/app/enroll/EnrollmentFormClient.tsx`** — `CheckboxList` upgraded to support `string[] | {value, label}[]` options; enrollment form now stores 2-letter language codes (was full display names) so new enrollments are consistent with the filter system.
- **`src/app/ngo/appointments/new/NgoBulkBooking.tsx`** — replaced 7-language `languageOptions` local array with `LANGUAGE_OPTIONS` from config (now all 13 languages); provider card shows formatted language names.
- **`src/app/admin/enrollments/[id]/page.tsx`** — `enrollment.languages.join(", ")` → `.map(formatLanguage).join(", ")`.
- **`src/app/patient/appointments/page.tsx`** — added `statusLabels` map (`NO_SHOW` → "No Show", `IN_PROGRESS` → "In Progress", etc.); replaced `appt.status.replace("_", " ")` with label map lookup; raw uppercase status codes no longer shown to patients.

## ✅ Done (added 2026-10-13 — availability messaging fix)
- **`src/app/providers/ProvidersClient.tsx`** — added `computeAvailability(allSlots, is24x7)` and `AvailabilityLabel` component. The "Available 24×7" emerald badge (which conflicted with "No slots open") replaced with a subdued indigo "24×7" capability chip (same style as In-person/Video). "Next Availability" section replaced with smarter labels: "in X min" (emerald, < 90 min), "Today at HH:MM" (emerald), "Tomorrow at HH:MM" (blue), "Fri, 17 Oct at HH:MM" (slate), "No upcoming slots" (muted) or "No upcoming slots · Accepts 24×7 bookings" (amber sublabel when is24x7 + no slots). All IST-correct via `Asia/Kolkata` locale. Client-side stale-slot filter guards against 60 s cache skew.

## ✅ Done (added 2026-10-13 — improve doctor search)
- **`src/config/symptomSpecialtyMap.ts`** — new `SYMPTOM_QUICK_PICKS` array (12 patient-friendly condition labels → specialty mappings). Used in the hero area of the providers page as clickable chips.
- **`prisma/schema.prisma`** — added `gender String?` to `Provider` model. Migration: `20261013000001_add_provider_gender`. Prisma client regenerated.
- **`src/app/api/admin/enrollments/[id]/approve/route.ts`** — copies `enrollment.gender` to the new Provider on approval.
- **`src/app/api/providers/search/route.ts`** — SearchKey extended with `gender`, `minFeePaise`, `maxFeePaise`, `avail`; `is24x7` boolean replaced with `avail` string (`"any"|"today"|"week"|"24x7"`); text search extended to include `qualification`; fee range parsed from `feeRange` param; `avail=today/week` filters via Prisma EXISTS sub-query on slots; cache tag bumped to `providers-search-v2`.
- **`src/app/providers/ProvidersClient.tsx`** — `is24x7` state replaced with `avail/gender/feeRange` state; sidebar has 4 new availability options, fee range (4 buckets), doctor gender (Male/Female/Any); hero section shows 12 symptom condition quick-pick chips that set `specialty` filter; filter summary line shows avail/gender/fee labels; `clearAllFilters` resets all new state.

## ✅ Done (added 2026-10-13 — P1 connected patient journey)
- **`src/app/patient/appointments/[id]/page.tsx`** — enriched with `labOrders` + `pharmacyFulfillment` in query. New "After your visit" section shows: lab orders (test names, status, results download), "Order medicines" CTA → `/services/rx-delivery`, "Book follow-up" link with date context pre-filled. Status labels now use `statusLabels` map (was raw string). Doctor's notes moved into care summary when appointment is complete.
- **`src/app/patient/appointments/page.tsx`** — "Book follow-up" modal path now includes `followUpNote` URL param with appointment date.
- **`src/app/book/[providerId]/ui/BookClient.tsx`** — reads `followUpNote` URL param; pre-fills `notes` state; shows a blue context banner in step 2 when booking a follow-up.
- **`src/app/patient/health/page.tsx`** (NEW) — patient health timeline page at `/patient/health`. Shows all appointments chronologically with nested lab orders (status + results download), prescription links, "Order medicines" and "Book follow-up" CTAs per appointment. Standalone Rx orders shown separately. Quick links section at bottom.
- **`src/components/PatientPortalNav.tsx`** — added "Health Record" tab.

## ✅ Done (added 2026-10-13 — P1 connected patient journey phase 2)
- **`prisma/schema.prisma` + migration `20261013000002_rxorder_appointment_link`** — `appointmentId String?` added to `RxOrder`; `rxOrders RxOrder[]` back-relation added to `Appointment`. Enables tracing medicine orders to the prescription consultation.
- **`src/app/api/provider/appointments/[appointmentId]/status/route.ts`** — new `COMPLETE` action: sets status to `COMPLETED`, records status history, fires post-consult WhatsApp to patient with prescription CTA, lab orders summary, and follow-up booking link.
- **`src/app/provider/(portal)/appointments/[id]/AppointmentActions.tsx`** — added "End consultation" button (emerald, calls COMPLETE action). Now shows green "Consultation complete" when already done.
- **`src/app/api/labs/orders/[orderId]/results/route.ts`** — also selects `slug` + `id` on provider; patient WhatsApp now appends "Need a follow-up with Dr. X? Book now: caldoc.in/book/{slug}" when order is linked to an appointment.
- **`src/app/patient/appointments/page.tsx`** — added `actionLabOrders` query (AWAITING_PAYMENT + REPORTS_READY lab orders); "Actions needed" panel above appointment list shows pay-now / download-results / book-follow-up CTAs.
- **`src/app/services/rx-delivery/page.tsx`** + **`RxDeliveryForm.tsx`** — accept `?appointmentId=` URL param; pass `appointmentId` in POST body so the created `RxOrder` is linked back to the originating appointment.
- **`src/app/api/services/rx-delivery/route.ts`** — reads `body.appointmentId`, verifies the appointment exists, stores `appointmentId` on the new `RxOrder`.
- **`src/app/patient/appointments/[id]/page.tsx`** + **`src/app/patient/health/page.tsx`** — "Order medicines" CTA now includes `?appointmentId=` param so the Rx order is traceable.

_Last updated: 2026-10-13 by Claude Code (P1 connected patient journey phase 2)_

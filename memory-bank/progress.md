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

## ✅ Done (added 2026-10-22 — cron route 500s fixed)
- **Root cause found:** Next.js router threw "You cannot use different slug names for the
  same dynamic path ('id' !== 'orderId')" at server startup due to two conflicting dynamic
  segment pairs in the route tree. Crashed the serverless function in 11ms with
  `FUNCTION_INVOCATION_FAILED` before any handler ran — affected ALL cron routes.
- **Fix 1:** Deleted empty ghost directory `/api/appointments/[id]/` (conflicted with
  `[appointmentId]`).
- **Fix 2:** Renamed `/api/patient/rx-orders/[orderId]/prescription/` →
  `/api/patient/rx-orders/[id]/prescription/`; updated internal param name; URL unchanged.
- **Fix 3:** `automaticVercelMonitors: false` in `next.config.ts` (Sentry option explicitly
  marked "does not work with App Router" — safe cleanup).
- **Fix 4:** Added `export const dynamic = "force-dynamic"` and outer try/catch to
  `cleanup-abandoned-bookings/route.ts` and `reminders/route.ts`.
- Confirmed locally: `next build` clean, `GET /api/cron/warm` → HTTP 200 in production mode.
- Deployed: commits `c8e1dde` + `c424baa` pushed to main 2026-10-22.

## 🚧 In Progress
- Vercel deployment of `c424baa` in progress (started 2026-10-22T02:36:56Z).

## 🐞 Broken / Known Issues
- **`JWT_SECRET=some-long-random-string`** — HARD BLOCK: weak/guessable value; all portal tokens forgeable. Must rotate to 64+ char random value in Vercel env.
- **Razorpay test keys** — `rzp_test_*` keys set; must swap to live keys before accepting real payments.
- **Vercel Pro plan required for hourly reminder cron (blocker)** — `0 * * * *` schedule in vercel.json requires Pro. Confirm before deploy.
- **No health endpoint** — `/api/dev/health` dir exists but no `route.ts`; nothing to ping for uptime monitoring.
- **`sendDefaultPii: true` in Sentry** — patient phone/name may appear in error payloads (PHI risk for telehealth context).
- **`LABS_ALLOWED_EMAILS` + `LABS_PORTAL_DEFAULT_PASSWORD` env vars unused** — remove from prod. (housekeeping)

## ✅ Previously listed as broken — confirmed already fixed
- Slot timezone: cron already uses IST correctly via `+05:30` offset in `makeISTTime()`.
- Razorpay webhook Rx/Lab gap: webhook handles Rx (`AWAITING_PAYMENT→PAID`) and Lab (`AWAITING_PAYMENT→PENDING`) with notify + dispatch — lines 92–162.
- OTP rate limiting: 60s resend cooldown + 10/day hard cap already in `/api/patient/login/request-otp`.
- LabPartner.serviceAreas: added in migration 20261014000003.
- generate-slots timezone + hardcoded schedule: fixed in 20261014000003 session.

## 📋 Next Up (P0 first)
- [ ] **P0:** Rotate `CRON_SECRET`, `JWT_SECRET` in production env before deploy
- [ ] **P0:** Swap Razorpay test keys to live keys
- [ ] **P0:** Ensure `CRON_SECRET` is set in GitHub repo secrets (needed by `cron-jobs.yml`)
- [ ] Add `GET /api/health` endpoint for uptime monitoring
- [ ] Consider `sendDefaultPii: false` in Sentry (PHI risk)
- [ ] Perf pass for homepage / providers / booking / checkout
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

## ✅ Done (added 2026-10-14 — diagnostics orchestration, task 15)
- **`src/lib/labCatalog.ts`** (NEW) — 35-entry lab test catalog with clinical metadata: prep instructions, fasting hours, sample type, home collection eligibility, turnaround days, per-test pricing (paise), requiresDoctorOrder. Lookup helpers: `findTestByCode`, `findTestByName`, `searchCatalog`.
- **`src/lib/labTests.ts`** — replaced flat 150-line string array; re-exports `LAB_TEST_OPTIONS` from labCatalog.
- **`src/lib/labPricing.ts`** — `computeLabAmount` now uses per-test catalog pricing; falls back to `LABS_HOME_TEST_PAISE` env var for uncatalogued tests.
- **`prisma/schema.prisma` + migration `20261014000001_lab_order_scheduling`** — `scheduledFor DateTime?`, `collectionType String?`, `scheduleNote String?` added to `LabOrder`.
- **`src/app/api/services/labs-at-home/suggestions/route.ts`** — suggestions now return rich metadata (fasting, sampleType, price, turnaround, prepInstructions, homeCollectionOk).
- **`src/app/api/provider/appointments/[appointmentId]/labs/route.ts`** — patient WhatsApp includes scheduling link.
- **`src/app/api/patient/appointments/[appointmentId]/schedule-labs/route.ts`** (NEW) — POST: validates patient ownership, updates LabOrder scheduling fields, creates timeline event, notifies lab partner.
- **`src/app/patient/appointments/[id]/schedule-labs/page.tsx`** + **`ScheduleLabsForm.tsx`** (NEW) — per-test prep instructions with fasting alerts, HOME/WALK_IN toggle, date picker (tomorrow to +14 days), time slot picker (6am–8pm, 30-min), address form pre-filled from last order.
- **`src/app/patient/lab-orders/[id]/page.tsx`** (NEW) — state-aware lab order detail: prep info + catalog metadata per test, schedule CTA (PENDING/CONFIRMED), pay CTA (AWAITING_PAYMENT), results download + follow-up link (REPORTS_READY), full timeline.
- **`src/app/patient/appointments/[id]/page.tsx`** — lab orders in "After your visit" section now show "View details" and "Schedule collection" buttons.
- **`src/app/labs/orders/[id]/page.tsx`** — patient-scheduled collection shown in blue info panel.

## ✅ Done (added 2026-10-14 — pharmacy orchestration UI)
- **`src/app/patient/appointments/[id]/order-medicines/page.tsx`** (NEW) + **`OrderMedicinesForm.tsx`** (NEW) — patient delivery address form, pre-filled prescription items, POSTs to rx-from-prescription API → redirects to review. Idempotent: if active order already exists, redirects straight to review.
- **`src/app/patient/rx-orders/[id]/review/page.tsx`** (NEW) + **`QuoteReviewForm.tsx`** (NEW) — fully state-aware quote review: QUOTE_PENDING shows "awaiting pharmacy" message; QUOTE_READY shows per-item availability/substitution table with checkbox approval form + confirm/cancel actions; AWAITING_PAYMENT shows pay CTA with amount; fulfilled states (PAID/PROCESSING/DISPATCHED/DELIVERED) + terminal states (REJECTED/CANCELLED/DELIVERY_FAILED) shown with timeline.
- **`src/app/pharmacy/rx-orders/[id]/RxQuoteForm.tsx`** (NEW) — pharmacy per-item quote form for QUOTE_PENDING orders: status picker (Available/Substitute/Unavailable), substitute name/sig, unit price and qty, per-item notes, global note, reject-entire-order toggle.
- **`src/app/pharmacy/rx-orders/[id]/page.tsx`** — updated: imports RxQuoteForm; Prisma query includes `rxOrderItems`; QUOTE_PENDING renders RxQuoteForm in right sidebar; per-item `rxOrderItems` table replaces flat `items` JSON in left column when available; all new statuses (QUOTE_PENDING, QUOTE_READY, REJECTED, DELIVERY_FAILED) added to STATUS_COLORS/LABELS/ICONS/NEXT_STEPS.

## ✅ Done (added 2026-10-13 — P1 connected patient journey phase 2)
- **`prisma/schema.prisma` + migration `20261013000002_rxorder_appointment_link`** — `appointmentId String?` added to `RxOrder`; `rxOrders RxOrder[]` back-relation added to `Appointment`. Enables tracing medicine orders to the prescription consultation.
- **`src/app/api/provider/appointments/[appointmentId]/status/route.ts`** — new `COMPLETE` action: sets status to `COMPLETED`, records status history, fires post-consult WhatsApp to patient with prescription CTA, lab orders summary, and follow-up booking link.
- **`src/app/provider/(portal)/appointments/[id]/AppointmentActions.tsx`** — added "End consultation" button (emerald, calls COMPLETE action). Now shows green "Consultation complete" when already done.
- **`src/app/api/labs/orders/[orderId]/results/route.ts`** — also selects `slug` + `id` on provider; patient WhatsApp now appends "Need a follow-up with Dr. X? Book now: caldoc.in/book/{slug}" when order is linked to an appointment.
- **`src/app/patient/appointments/page.tsx`** — added `actionLabOrders` query (AWAITING_PAYMENT + REPORTS_READY lab orders); "Actions needed" panel above appointment list shows pay-now / download-results / book-follow-up CTAs.
- **`src/app/services/rx-delivery/page.tsx`** + **`RxDeliveryForm.tsx`** — accept `?appointmentId=` URL param; pass `appointmentId` in POST body so the created `RxOrder` is linked back to the originating appointment.
- **`src/app/api/services/rx-delivery/route.ts`** — reads `body.appointmentId`, verifies the appointment exists, stores `appointmentId` on the new `RxOrder`.
- **`src/app/patient/appointments/[id]/page.tsx`** + **`src/app/patient/health/page.tsx`** — "Order medicines" CTA now includes `?appointmentId=` param so the Rx order is traceable.

## ✅ Done (added 2026-10-14 — Follow-Up as First-Class Feature)
- **`prisma/schema.prisma` + migration `20261014000002_follow_up_requests`** — `FollowUpRequest` model: type (TIMED|AFTER_LAB_RESULTS), status (PENDING|NOTIFIED|BOOKED|DISMISSED|EXPIRED), dueAt, providerNote, relations to Appointment/Patient/Provider/LabOrder.
- **`/api/provider/appointments/[appointmentId]/followup`** — POST (create/replace, typed WhatsApp) + GET (active follow-up for UI).
- **`/api/patient/follow-ups/[id]/dismiss`** — patient dismiss endpoint (ownership-verified).
- **`/api/cron/follow-up-reminders`** — daily cron (7am IST): WhatsApp TIMED follow-ups due in 48h, expires overdue ones. Added to `vercel.json`.
- **`/api/labs/orders/[orderId]/results`** — on results upload: triggers AFTER_LAB_RESULTS follow-up (sets dueAt=now, status=NOTIFIED); patient WA message updated.
- **`AppointmentActions.tsx`** — full follow-up panel: shows existing state + "Request/Update" button → modal with type picker, days selector, providerNote, lab order picker.
- **`/provider/(portal)/appointments/[id]/page.tsx`** — parallel Prisma query for activeFollowUp; passes labOrders + existingFollowUp to AppointmentActions.
- **`src/components/DismissFollowUpButton.tsx`** (NEW) — client dismiss button with router.refresh().
- **`src/app/patient/page.tsx`** — 6th parallel query (FollowUpRequest PENDING|NOTIFIED); doctor-requested follow-up cards with booking link + dismiss; heuristic suggestions suppressed when active doctor requests exist.

## ✅ Done (added 2026-10-14 — Lab & Pharmacy Partner Transparency)
- **`src/components/PartnerDisclosureCard.tsx`** (NEW) — reusable server component for both lab and pharmacy partner attribution. Shows partner name, city/state, NABL Accredited badge + cert number (labs) or Drug Licence (pharmacy), and a CalDoc-orchestrates / partner-fulfills explanation. Falls back to generic "licensed partner" text when no partner is assigned yet.
- **`src/app/patient/lab-orders/[id]/page.tsx`** — added `labPartner` to Prisma include; `PartnerDisclosureCard type="lab"` rendered after the status description panel.
- **`src/app/patient/rx-orders/[id]/review/page.tsx`** — added `pharmacyPartner` to Prisma include; `PartnerDisclosureCard type="pharmacy"` rendered after the status description. STATUS_META descriptions updated to say "pharmacy partner" throughout (QUOTE_PENDING, QUOTE_READY, PAID, PROCESSING, DISPATCHED, REJECTED).
- **`src/app/patient/appointments/[id]/schedule-labs/page.tsx`** — lab order include now fetches `labPartner`; `PartnerDisclosureCard type="lab"` shown before the scheduling form.
- **`src/app/patient/appointments/[id]/order-medicines/page.tsx`** — subtitle updated from vague "pharmacy partner near you" to explicit: "licensed pharmacy partner… CalDoc coordinates your order; the pharmacy partner dispenses your medicines."

## ✅ Done (added 2026-10-14 — Backend API audit + Rx checkout fix)
- **Critical fix: `/api/rx-orders/create-order/route.ts`** (NEW) — Razorpay order creation for `RxOrder`. Was deleted but still called by `RxOrderCheckoutClient`. Mirrors lab-orders pattern. `AWAITING_PAYMENT` guard, Payment upsert, returns `{ key, orderId, prefill }`.
- **Critical fix: `/api/rx-orders/confirm/route.ts`** (NEW) — HMAC-verified payment confirmation for Rx orders. Transitions `AWAITING_PAYMENT → PAID`, captures Payment, WhatsApp patient, dispatches to pharmacy partner. Idempotent on duplicate callback.
- **Dead code deleted:** `/api/cron/route.ts` (re-export alias, not in vercel.json), `src/middleware_disabled.ts` (obsolete disabled middleware), `/api/sentry-example-api/route.ts` (dev scaffold with no auth).
- Full 131-route API audit: no other broken integrations found.

## ✅ Done (added 2026-10-14 — Production schema hardening)
Full DB audit of all 42 models. Migration `20261014000003_production_schema_hardening`:
- **Removed** `Appointment.paymentId` (legacy, never read; actual payment via `Payment.appointmentId` relation)
- **Added** `AdminUser.role String @default("SUPER_ADMIN")` — role-based admin access
- **Added** `Provider.{offboardedAt, offboardedBy, offboardingReason, createdAt, updatedAt}` — offboarding audit + change tracking
- **Added** `LabPartner.serviceAreas String[]` — postal-code routing parity with PharmacyPartner
- **Dropped** `Medication @@index([name])` — redundant with @unique constraint
- **Added 14 missing indexes:** AuditLog (actorId+at, at, action), WebhookEvent (orderId, source+type), PatientDocument (patientId), PatientOtp (patientId), OfflineRequest (status+createdAt), PatientPasswordReset (patientId), ProviderUser (providerId), LabUser (labPartnerId), PharmacyUser (pharmacyPartnerId), LabOrder (patientId+status)
- **New model `RefundRequest`** — payment refund tracking with gatewayRefundId, status, actor
- **New model `ProviderScheduleTemplate`** — recurring weekly availability windows (dayOfWeek, hours, slotDuration)
- **3 architecture documents** created in `docs/db/`: `data-mapping.md`, `data-dictionary.md`, `architecture.md`
- **ADR-008** recorded in `architecturalDecisions.md`

**`/api/cron/generate-slots` updated** to read from `ProviderScheduleTemplate`. Per-provider template-driven slot generation using `createMany + skipDuplicates` (one DB call per provider instead of per-slot). Falls back to `09:00–17:00 / 30 min` for providers with no templates. Added `isActive: true` filter on providers query (was previously generating slots for deactivated providers). Prisma client regenerated.

## ✅ Done (added 2026-10-19 — auth/security hardening)
- **`patientMobileToken.ts`** — single `JWT_SECRET`, no `"change-me"` fallback.
- **`/api/video/ensure-room`** — `resolveCallerIdentity()` with appointment ownership; `isOwner` server-derived.
- **`/api/checkout/create-order`** — patient auth + dual ownership (patientId OR phone).
- **`/api/labs/orders/[orderId]/results`** — `labPartnerId` ownership: `!= null` (not truthiness).
- **`/api/webhooks/razorpay`** — HMAC verified with `timingSafeEqual` (was plain `!==`).
- **`/api/contact`** — rate limited 5 req/min per IP.
- **`/api/appointments/emergency`** — rate limited 2/min IP + 1/hr phone.
- **`/api/patient/profile`** — phone field removed from profile update (requires OTP re-login to change); unused imports cleaned up.
- **`/api/appointments/create`** — 3/min IP + 3/day phone two-layer limits.
- **`/api/services/rx-delivery`** — 3/hr IP + 2/day phone two-layer limits.
- **`/api/offline-requests`** — 5/hr IP + 3/day phone two-layer limits.
- **`/api/enroll/labs`** + **`/api/enroll/pharmacy`** — 3/hr IP + 2/day email two-layer limits.
- **`/api/patient/login/request-otp`** — 5/min IP limit added; unified both per-phone 429 responses to identical message (prevents phone enumeration via differential error timing/message).
- **Super-admin + role management:** `AdminUser.role` enforced; `requireSuperAdminSession()`; admin-users CRUD (SUPER_ADMIN only, self-lockout prevention); admin portal UI pages.
- **Frontdesk multi-clinic scoping:** `FrontDeskUserClinic` join table; `requireFrontDeskSession()` returns scoped `providerIds`; calendar, reschedule, lab/rx status routes all scoped.
- Zero TypeScript errors.

## ✅ Done (added 2026-10-14 — logAudit wiring across all key routes)
- `src/lib/audit.ts` — `ActorType` expanded to include `PHARMACY | LAB | FRONTDESK | NGO`
- **Payment confirms:** `checkout/confirm` (`PAYMENT_CAPTURED` emergency + standard), `rx-orders/confirm` (`RX_PAYMENT_CAPTURED`), `lab-orders/confirm` (`LAB_PAYMENT_CAPTURED`)
- **Login events:** `PATIENT_LOGIN` (OTP + email), `PROVIDER_LOGIN`, `ADMIN_LOGIN` (both combined and standalone routes), `PHARMACY_LOGIN`, `LAB_LOGIN`, `FRONTDESK_LOGIN`, `NGO_LOGIN`
- **Appointment status:** `APPOINTMENT_CONFIRMED/CANCELLED/NO_SHOW/RESCHEDULED/COMPLETED` (provider portal); `APPOINTMENT_CANCELLED` (patient self-cancel, admin cancel)
- **Enrollment decisions:** `ENROLLMENT_APPROVED/REJECTED` (provider), `LAB_ENROLLMENT_APPROVED/REJECTED`, `PHARMACY_ENROLLMENT_APPROVED/REJECTED`
- **Provider offboard:** `PROVIDER_DEACTIVATED` / `PROVIDER_REACTIVATED`
- Zero TypeScript errors after all 21 files updated.

## ✅ Done (added 2026-10-21 — P1 backlog clearance + continued auth hardening)
- **`requireOperationsSession()`** added to `auth.server.ts` — gates `SUPER_ADMIN | OPERATIONS` roles only.
- **25 admin mutation routes** upgraded from `requireAdminSession` to `requireOperationsSession`: all provider CRUD, all enrollment approve/reject (provider + labs + pharmacy), all lab/pharmacy/frontdesk user management, lab/pharmacy partners, NGO reservations, send-enrollment-link.
- **Appointment cancel / order status** routes remain open to all admin roles (SUPPORT can handle ops).
- **Password reset for lab users:** `PATCH /api/admin/lab-users/[id]` — bcrypt re-hash, OPERATIONS+ only.
- **Password reset for pharmacy users:** `PATCH /api/admin/pharmacy-users/[id]` — same pattern.
- **Public route error sanitization:** `rx-delivery` + `labs-at-home` no longer return raw `err.message` to clients; log server-side only.
- **Admin cancel + new password-reset handlers** wrapped in try/catch (were unprotected against DB errors).
- **Auth hardening continued:** `requireLabsSession` / `requirePharmacySession` now cross-check JWT `pid` vs DB partner ID; reject if partner unassigned; login blocked for unassigned users.
- **Patient profile phone:** confirmed already fixed (phone immutable, no cookie update). Stale audit finding.
- **NGO reservation IDOR:** `confirm-patient` route moved to `findFirst({ where: { id, ngoId } })` pattern — 404 on cross-NGO access, not 403.

## ✅ Done (added 2026-10-21 — auth hardening continued + E2E test pass)
- **TypeScript fix:** `MAX_AGE_DAYS` import added to `provider/login/route.ts` (was used but missing from import).
- **Env var fix:** `PROVIDER_DEFAULT_PASSWORD` renamed to `PROVIDER_PORTAL_DEFAULT_PASSWORD` in `.env.local` (code always read the `_PORTAL_` variant).
- **E2E flow traced:** booking → slot lock → Razorpay order → HMAC confirm → CONFIRMED state → video room setup + notifications. No logic gaps found.
- **64/64 unit tests pass** (`vitest run`): create.test, confirm.test, razorpay.test, auth.test, patientAuth.test, format.test, validateAddress.test.
- **0 TypeScript errors** (`tsc --noEmit`).
- **Sentry monitoring confirmed wired:** server + edge + client configs all init with DSN; `onRequestError = captureRequestError` in `instrumentation.ts`; manual `captureException` in payment routes.
- **Production env checklist complete** — blockers documented in 🐞 section above.

_Last updated: 2026-10-22 by Claude Code (cron route FUNCTION_INVOCATION_FAILED root-caused and fixed — dynamic slug conflict)_

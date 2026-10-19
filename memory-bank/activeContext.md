# Active Context

> What the agents are working on RIGHT NOW. Volatile — overwrite freely.
> This is the session-state file for Claude Code.

## Current Focus
- **Sprint:** Sprint 01 — "Stabilize + Performance Foundation"
- **Last task (2026-10-14):** Production schema hardening — full DB audit, 17-change migration, 3 architecture docs — COMPLETE.
- **Next task:** Update `generate-slots` cron to read from `ProviderScheduleTemplate`; then P0 booking→payment→consult test pass.

## Backend API Audit — COMPLETED (2026-10-14)

### Critical fix
- **`/api/rx-orders/create-order/route.ts`** (NEW) — Razorpay order creation for `RxOrder.status=AWAITING_PAYMENT`. Mirrors `/api/lab-orders/create-order` pattern. Upserts Payment with `rxOrderId`.
- **`/api/rx-orders/confirm/route.ts`** (NEW) — HMAC-verified payment confirmation. Transitions `AWAITING_PAYMENT → PAID`, marks Payment `CAPTURED`, sends patient WhatsApp, dispatches to pharmacy (fire-and-forget).
- These two routes were previously deleted but still called by `RxOrderCheckoutClient.tsx` at `/services/rx-delivery/pay`. The Razorpay checkout for standalone Rx delivery is now functional.

### Dead code removed
- **`/api/cron/route.ts`** — deleted (re-export alias of `./reminders/route`; not in vercel.json; zero callers).
- **`src/middleware_disabled.ts`** — deleted (obsolete draft middleware; confirmed unused by App Router).
- **`/api/sentry-example-api/route.ts`** — deleted (unauthenticated dev-only endpoint that intentionally throws; no production value).

### No integration gaps found in remaining audit
- `OfflineRequestActions.tsx` correctly uses `PATCH` matching the route.
- All 131 routes cross-referenced against frontend calls — no other broken integrations.

## Follow-Up as First-Class Feature — COMPLETED (2026-10-14)

Full doctor-driven follow-up system: schema, migration, API routes, cron, lab results hook, provider UI modal, patient dashboard cards.

### Schema + migration
- `FollowUpRequest` model added to `prisma/schema.prisma` (migration `20261014000002_follow_up_requests`):
  - `type: "TIMED" | "AFTER_LAB_RESULTS"`, `status: PENDING|NOTIFIED|BOOKED|DISMISSED|EXPIRED`
  - Relations: Appointment, Patient, Provider, LabOrder (optional, SetNull on delete)
  - Indexes: `[patientId, status]`, `[status, dueAt]`, `[appointmentId]`

### API routes
- **`/api/provider/appointments/[appointmentId]/followup`** — POST creates FollowUpRequest (expires any existing PENDING first, sends typed WhatsApp); GET returns active follow-up for provider UI.
- **`/api/patient/follow-ups/[id]/dismiss`** — POST: patient dismisses their own follow-up (PENDING→DISMISSED).
- **`/api/cron/follow-up-reminders`** — GET: finds TIMED follow-ups with `dueAt` ≤ now+48h, sends WhatsApp, sets NOTIFIED; also expires TIMED follow-ups overdue by >7 days. Added to `vercel.json` at `30 1 * * *` (7am IST).
- **`/api/labs/orders/[orderId]/results`** — on results upload: finds AFTER_LAB_RESULTS PENDING follow-up for the appointment, sets `dueAt=now`, `status=NOTIFIED`, `notifiedAt=now`; patient WhatsApp message updated to mention follow-up when doctor is linked.

### Provider portal
- **`AppointmentActions.tsx`** — replaced simple "Send follow-up reminder" button with full "Follow-up" panel:
  - Shows existing follow-up (type, daysUntilDue, status, dueAt, providerNote) when active
  - "Request / Update" button opens modal with: type picker (TIMED/AFTER_LAB_RESULTS), days selector (3/7/14/30), optional providerNote (≤300 chars), lab order picker (AFTER_LAB_RESULTS only)
  - Submits POST → updates panel state optimistically
- **`/provider/(portal)/appointments/[id]/page.tsx`** — added `activeFollowUp` query (Prisma, PENDING|NOTIFIED) in parallel with slots; passes `labOrders` + `existingFollowUp` to AppointmentActions.

### Patient dashboard
- **`src/components/DismissFollowUpButton.tsx`** (NEW) — small client component, POSTs dismiss, calls `router.refresh()`
- **`src/app/patient/page.tsx`** — 6th parallel query for `FollowUpRequest` (PENDING|NOTIFIED); new section "6a. Doctor-requested follow-ups" renders actual FollowUpRequest cards (doctor name, type, dueAt, providerNote, booking link, dismiss button); "6b. Heuristic suggestions" only shown when no active doctor-requested follow-ups exist; `actionCount` updated.

## All messages are clinically neutral
- Follow-up WhatsApp messages are care continuity prompts only
- Doctor's `providerNote` is quoted as-is (max 300 chars)
- No automated clinical conclusions are generated

## logAudit Wiring — COMPLETED (2026-10-14)

Added `logAudit` fire-and-forget calls to 21 routes covering all high-impact events:

### ActorType expanded
`src/lib/audit.ts` — `ActorType` now includes `"PHARMACY" | "LAB" | "FRONTDESK" | "NGO"` in addition to the existing four.

### Payment confirms (3 routes)
- `checkout/confirm` — `PAYMENT_CAPTURED` (emergency + standard paths)
- `rx-orders/confirm` — `RX_PAYMENT_CAPTURED`
- `lab-orders/confirm` — `LAB_PAYMENT_CAPTURED`

### Login events (8 portals)
`PATIENT_LOGIN` (OTP + email), `ADMIN_LOGIN`, `PROVIDER_LOGIN` (combined route), `PHARMACY_LOGIN`, `LAB_LOGIN`, `FRONTDESK_LOGIN`, `NGO_LOGIN`

### Appointment status changes (3 routes)
- Provider portal: `APPOINTMENT_CONFIRMED`, `APPOINTMENT_CANCELLED`, `APPOINTMENT_NO_SHOW`, `APPOINTMENT_RESCHEDULED`, `APPOINTMENT_COMPLETED`
- Patient cancel: `APPOINTMENT_CANCELLED` (actorType: PATIENT)
- Admin cancel: `APPOINTMENT_CANCELLED` (actorType: ADMIN)

### Enrollment decisions (6 routes)
`ENROLLMENT_APPROVED/REJECTED` (provider), `LAB_ENROLLMENT_APPROVED/REJECTED`, `PHARMACY_ENROLLMENT_APPROVED/REJECTED`

### Provider offboard (1 route)
`PROVIDER_DEACTIVATED` / `PROVIDER_REACTIVATED`

## Auth/Security Hardening — COMPLETED (2026-10-19)

### Critical fixes applied
1. **`src/lib/patientMobileToken.ts`** — Removed `"change-me"` fallback JWT secret. Single `JWT_SECRET` required (throws if absent).
2. **`src/app/api/video/ensure-room/route.ts`** — Full `resolveCallerIdentity()` rewrite. Patient/provider/admin auth with appointment ownership checks. `isOwner` derived server-side, never from request body.
3. **`src/app/api/checkout/create-order/route.ts`** — Patient auth + dual ownership check (patientId OR phone).

### Remaining fixes applied (2026-10-19)
4. **`src/app/api/labs/orders/[orderId]/results/route.ts`** — Tightened `labPartnerId` ownership check: `!= null` (explicit null check) instead of truthiness. Ensures scoped lab users are always checked against their partner.
5. **`src/app/api/webhooks/razorpay/route.ts`** — HMAC comparison now uses `crypto.timingSafeEqual` to eliminate timing side-channel.
6. **`src/app/api/contact/route.ts`** — Rate limiting added: 5 req/min per IP.
7. **`src/app/api/appointments/emergency/route.ts`** — Rate limiting added: 5 req/min per IP.
8. **`src/app/api/patient/profile/route.ts`** — Phone field removed from profile update. Phone is the verified patient identity; changes require a new OTP login. Unused imports cleaned up.

### Outstanding (needs design discussion)
- **Frontdesk clinic scoping** — `requireFrontDeskSession()` returns no `clinicId`; frontdesk users can access all appointments system-wide. Requires schema + session design work before fixing.

## Next Action
P0: End-to-end booking → payment → consultation test pass.
Then: Error-handling consistency across all API routes.

## Blockers
- None.

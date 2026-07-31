# Active Context

> What the agents are working on RIGHT NOW. Volatile — overwrite freely.
> This is the session-state file for Claude Code.

## Current Focus
- **Sprint:** Sprint 01 — "Stabilize + Performance Foundation"
- **Last task (2026-07-29):** Labs end-to-end flow fix + Lab CRM. COMPLETE.
- **Next task:** P0 booking→payment→consult test pass; error-handling consistency.

---

## Labs End-to-End Fix + Lab CRM — COMPLETED (2026-07-29)

### What was broken
1. Onboarding created `LabPartner` record but no login credentials, no notification, no duplicate check.
2. Login used `LABS_ALLOWED_EMAILS` env-var whitelist + auto-created users on login — fragile.
3. Lab orders created with no `labPartnerId` (auto-routing not implemented).
4. Payment confirmation notified hardcoded phone (`LABS_ADMIN_PHONE`), not the assigned lab partner.
5. Results upload set status to REPORTS_READY but never saved `resultsPdfKey` on the order, and
   never notified patient or prescribing doctor.
6. No dedicated CRM page for lab partner to manage an order; only inline status buttons existed.
7. Patient lab portal showed raw status codes and no "Download results" button even when ready.

### What was fixed
- **Schema:** Added `resultsPdfKey String?` to `LabOrder` (migration `20260729000000_add_lab_results_key`).
- **`/api/admin/lab-partners` (POST):** Duplicate email check (redirect-with-err), auto-creates `LabUser`
  with `labPartnerId` + temp password, WhatsApp credentials notification to lab phone.
- **`/admin/lab-partners/onboard/page.tsx`:** Reads `err` searchParam, shows rose error banner.
- **`/api/labs/login` (POST):** Removed env whitelist and auto-create-on-login. Pure DB auth (bcrypt).
- **`/api/services/labs-at-home` (POST):** Auto-assigns first active `homeCollection: true` lab partner
  at order creation.
- **`/api/lab-orders/confirm` (POST):** Looks up assigned `LabPartner.phone`, notifies that phone
  instead of hardcoded fallback.
- **`/api/labs/orders/[orderId]/results` (POST):** Saves `resultsPdfKey` to `LabOrder`, notifies
  patient via WhatsApp + notifies prescriber (appointment.provider.phone) on results upload.
- **`/api/labs/orders/[orderId]/results/download` (GET):** NEW — lab-scoped signed S3 URL for results.
- **`/api/patient/lab-orders/results/[orderId]` (GET):** NEW — patient-scoped signed S3 URL (verifies
  phone ownership).
- **`/labs/orders/[id]/page.tsx`:** NEW — full CRM detail page: patient info, home address + Maps link,
  collection agent, tests list, prescribing doctor, results download, full event timeline.
- **`/labs/orders/[id]/LabCRMActions.tsx`:** NEW — step-by-step workflow buttons
  (Confirm + agent fields → Sample collected → Processing → Mark ready → Complete)
  + inline results file upload with patient+prescriber notify on success.
- **`/labs/page.tsx`:** "Full timeline →" (pointing to `/admin/labs`) replaced with "Manage →"
  pointing to `/labs/orders/[id]`. Amber "Action needed" pulse badge on PENDING/CONFIRMED orders.
- **`/patient/labs/page.tsx`:** Results download button (teal) when `resultsPdfKey` exists;
  human-readable status labels covering all pipeline states.

### Files changed (commit 9db7dac)
- `prisma/schema.prisma` + `prisma/migrations/20260729000000_add_lab_results_key/migration.sql`
- `src/app/api/admin/lab-partners/route.ts`
- `src/app/admin/lab-partners/onboard/page.tsx`
- `src/app/api/labs/login/route.ts`
- `src/app/api/services/labs-at-home/route.ts`
- `src/app/api/lab-orders/confirm/route.ts`
- `src/app/api/labs/orders/[orderId]/results/route.ts`
- `src/app/api/labs/orders/[orderId]/results/download/route.ts` ← new
- `src/app/api/patient/lab-orders/results/[orderId]/route.ts` ← new
- `src/app/labs/orders/[id]/page.tsx` ← new
- `src/app/labs/orders/[id]/LabCRMActions.tsx` ← new
- `src/app/labs/page.tsx`
- `src/app/patient/labs/page.tsx`

### Remaining lab gaps (next sprint)
- No lab-specific `serviceAreas` field on `LabPartner` — routing uses `homeCollection: true` (first
  active lab). If multiple lab partners exist, add `serviceAreas String[]` + postal code matching.
- No password-change / forgot-password flow for lab users (same gap as pharmacy).
- `LABS_ALLOWED_EMAILS` + `LABS_PORTAL_DEFAULT_PASSWORD` env vars are now unused — remove from prod env.

## Next Action
P0: End-to-end booking → payment → consultation test pass.
Then: Error-handling consistency across all API routes.

## Blockers
- None.

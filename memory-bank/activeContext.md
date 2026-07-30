# Active Context

> What the agents are working on RIGHT NOW. Volatile — overwrite freely.
> This is the session-state file for Claude Code.

## Current Focus
- **Sprint:** Sprint 01 — "Stabilize + Performance Foundation"
- **Last task (2026-07-29):** Pharmacy end-to-end flow fix. COMPLETE.
- **Next task:** Rx order management UI for pharmacy portal (update status, add tracking); then P0 booking→payment→consult test pass.

---

## Pharmacy End-to-End Fix — COMPLETED (2026-07-29)

### What was broken
1. Onboarding created a `PharmacyPartner` record but no login credentials, no notification.
2. Login used an env-var email whitelist (`PHARMACY_ALLOWED_EMAILS`) — fragile, bypasses DB auth.
3. Pharmacy portal showed ALL Rx orders regardless of which partner the logged-in user belongs to.
4. Rx delivery orders were created with no pharmacy partner assigned (`pharmacyPartnerId` = null).
5. Payment confirmation notified a hardcoded phone (`PHARMACY_ADMIN_PHONE`), not the assigned partner.
6. Sign-out in pharmacy layout was a Link to `/pharmacy/login` — didn't clear the session cookie.

### What was fixed
- **`/api/admin/pharmacy-partners` (POST):**
  - Duplicate detection: rejects duplicate email or drug license number (redirects back with error msg).
  - Auto-creates `PharmacyUser` with `pharmacyPartnerId` linked and a random 12-char temp password.
  - Sends WhatsApp notification to the pharmacy contact phone with portal URL + temp credentials.
- **`/admin/pharmacy-partners/onboard/page.tsx`:** Reads `err` searchParam and shows a rose error banner above the form.
- **`/api/pharmacy/login` (POST):** Removed env whitelist. Pure DB auth: find user → bcrypt compare → JWT. No auto-create on login.
- **`/api/pharmacy/logout` (GET/POST):** New route. Clears `pharmacy_sess` cookie, redirects to login.
- **`/pharmacy/layout.tsx`:** Sign-out changed from a `<Link>` to a `<form method="POST" action="/api/pharmacy/logout">`.
- **`/pharmacy/page.tsx`:** `rxOrders` query now scoped by `sess.pharmacyPartnerId` (admin sees all when null).
- **`/api/services/rx-delivery` (POST):** After order creation, finds an active `PharmacyPartner` whose `serviceAreas` includes the delivery postal code and assigns `pharmacyPartnerId`.
- **`/api/rx-orders/confirm` (POST):** After payment capture, notifies the *assigned* pharmacy's WhatsApp (from `PharmacyPartner.phone`) instead of a hardcoded env var.

### Files changed
- `src/app/api/admin/pharmacy-partners/route.ts`
- `src/app/admin/pharmacy-partners/onboard/page.tsx`
- `src/app/api/pharmacy/login/route.ts`
- `src/app/api/pharmacy/logout/route.ts` ← new file
- `src/app/pharmacy/layout.tsx`
- `src/app/pharmacy/page.tsx`
- `src/app/api/services/rx-delivery/route.ts`
- `src/app/api/rx-orders/confirm/route.ts`

### Remaining gaps (next sprint)
- Pharmacy portal has no UI to update Rx order status (PROCESSING → DISPATCHED → DELIVERED) or add tracking number; only admin can do this today.
- Appointment-based fulfillment queue is still unscoped (all pharmacies see all appointments) — needs a pharmacy assignment step or postal code matching.
- No "forgot password" / password-change flow for pharmacy users.
- `PHARMACY_ALLOWED_EMAILS` env var is now unused — can be removed from production env.

## Next Action
P0: End-to-end booking → payment → consultation test pass.
Then: Rx order status management UI for pharmacy portal.

## Blockers
- None.

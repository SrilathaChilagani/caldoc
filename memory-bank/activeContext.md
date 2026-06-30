# Active Context

> What the agents are working on RIGHT NOW. Volatile — overwrite freely.
> This is the session-state file for Claude Code.

## Current Focus
- **Sprint:** Sprint 01 — "Stabilize + Performance Foundation"
- **Last task (2026-06-29):** Architecture review + foundational question resolution. COMPLETE.
- **Next task:** End-to-end booking → payment → consultation test pass (P0 backlog).

---

## Architecture Review — COMPLETED (2026-06-29)

### Part A — Findings

**🔴 Bug: cleanup-abandoned-bookings cron never ran**
- File: `src/app/api/cron/cleanup-abandoned-bookings/route.ts`
- Vercel cron fires HTTP GET, but the route only exported `POST` → 405 every time.
- **Fixed:** renamed `POST` → `GET`.

**🔴 Bug: Reminder cron missed ~95% of appointments**
- File: `vercel.json`
- Schedule was `0 3 * * *` (3 AM UTC, once/day) with 30-min window.
- Only appointments at 8:30–9:00 AM IST got reminders; all other times missed.
- **Fixed:** changed schedule to `0 * * * *` (hourly). OutboundMessage `kind` dedup prevents double-sends.
- Note: Vercel Pro plan required for sub-daily crons.

**🔴 Bug: Lab order status update — no partner ownership check**
- File: `src/app/api/labs/orders/[orderId]/route.ts`
- Any authenticated lab user could update any lab partner's orders.
- **Fixed:** added `labPartnerId` ownership guard (admin bypass when `labPartnerId === null`).

**🟡 Bug: Patient session cookie missing `secure` flag**
- File: `src/app/api/patient/login/verify-otp/route.ts`
- Cookie was sent over HTTP in production (no `secure: true`).
- **Fixed:** added `secure: process.env.NODE_ENV === "production"`.

**🟡 Bug: Payment.updatedAt never auto-updated**
- File: `prisma/schema.prisma`
- `updatedAt` had `@default(now())` but no `@updatedAt` directive.
- **Fixed:** added `@updatedAt`.

### Part A — Verified Sound
- **Auth/session:** JWT stored httpOnly cookies ✅. Provider/admin session helpers do DB
  verification (deleted accounts can't reuse tokens) ✅. Cookie domain logic correct ✅.
- **Payment flow:** HMAC signature verified on webhook ✅. Idempotency via payment status
  check before processing ✅. DB transaction covers slot lock + appointment status +
  payment update atomically ✅. Terminal state protection (COMPLETED/CANCELLED/NO_SHOW
  not overwritten by retried webhook) ✅.
- **Data isolation:** Provider scoping enforced in all provider routes
  (`appointment.providerId !== session.providerId` → 404) ✅. Lab gap fixed above.
  Admin fallback to labs/pharmacy/frontdesk portals is intentional ✅.
- **Schema integrity:** All money integer paise ✅. State machines logged in history
  tables ✅. Slot double-booking prevented via `updateMany` with `isBooked:false`
  atomic check ✅.
- **Background jobs:** Cron secret pattern acceptable for dev/prod split ✅.
  OutboundMessage dedup via `kind` prevents duplicate reminders ✅.

### Foundational Questions — RESOLVED
1. **Isolation (ADR-001):** App-level scoping is correct and consistent (confirmed).
   Lab gap fixed. Accepted.
2. **Middleware pass-through (Q2):** INTENTIONAL. App Router enforces auth per-handler
   with DB verification. Edge middleware can't use Prisma. No unprotected sensitive
   routes found. Acceptable for launch.
3. **No job queue (Q3):** ACCEPTABLE FOR LAUNCH. Webhook idempotency + OutboundMessage
   dedup + withRetry covers risks. Revisit post-launch if reminder failures > 5%.
4. **Compliance (Q4):** Server-side canonical consent text already in `appointments/create`
   (references Telemedicine Practice Guidelines 2020 + Schedule X). AuditLog model
   exists. Legal pages present. Gap: AuditLog not written for all sensitive actions
   (P1 backlog item).

### Part B — Suggestions (not yet implemented — P1 backlog)
1. **Slot timezone bug:** `generate-slots` creates `09:00–17:00` UTC = `14:30–22:30 IST`.
   Needs IST offset (+05:30) in slot datetime construction.
2. **Rx/Lab webhook gap:** `webhooks/razorpay` returns `ok: ignored` for Rx/Lab payments.
   Webhook-driven confirmation missing for these flows — only client-side confirm works.
3. **No rate limiting on OTP:** `/api/patient/login/request-otp` — no rate limit, brute-
   forceable. Add IP rate limit (Vercel Edge Config or upstash/ratelimit).
4. **AuditLog under-used:** Only `AuditLog` model exists; few routes write to it.
   Critical actions (login, payment, appointment status changes) should log.
5. **Error handling inconsistency:** Some routes return raw error messages; needs a
   shared `createErrorResponse()` wrapper from `src/lib/errors.ts`.

## Next Action
P0: End-to-end booking → payment → consultation test pass.

## Blockers
- None. Hourly crons run via GitHub Actions (`.github/workflows/cron-jobs.yml`) — same
  pattern as `warm.yml`. Ensure `CRON_SECRET` is set in GitHub repo secrets.

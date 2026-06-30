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

## 🚧 In Progress
- Sprint 01: production-readiness checklist.

## 🐞 Broken / Known Issues
- `generate-slots` cron creates slots at UTC times (09:00–17:00 UTC = 14:30–22:30 IST) — should use IST offset. (P1)
- Razorpay webhook silently ignores Rx/Lab order payments — only client-side confirm works for those flows. (P1)
- AuditLog model under-used — sensitive actions (login, payment, status change) not consistently logged. (P1)
- Error handling not consistent across all API routes. (P0)
- Vercel Pro plan required for hourly reminder cron (`0 * * * *`) — confirm plan before deploy. (blocker)

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
_Last updated: 2026-06-29 by Claude Code_

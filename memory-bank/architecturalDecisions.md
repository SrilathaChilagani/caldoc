# Architectural Decisions

> ADR-style log. Entries below are **inferred from the codebase** and marked
> `Status: Observed (confirm)` — they document what the code already does, not a
> formally ratified decision. Confirm/adjust with the team, then flip to `Accepted`.
> Append new decisions; supersede rather than rewrite.

## Format
```
## ADR-XXX: <Title>
- Date: YYYY-MM-DD
- Status: Proposed | Observed (confirm) | Accepted | Superseded by ADR-YYY
- Context: forces/problem
- Decision: what we chose
- Alternatives considered: what we rejected and why
- Consequences: tradeoffs, risks, follow-ups
```

---

## ADR-001: Multi-role / multi-portal model instead of tenant isolation
- **Date:** 2026-06-17
- **Status:** Accepted
- **Context:** Platform serves patients, providers, admins, front-desk, NGOs, labs, and pharmacies.
- **Decision:** Separate user tables per role, each with its own login portal, sharing one Postgres DB. No `tenant_id` column or row-level security. Partner-scoped users are constrained by FK (`providerId`, `ngoId`, `labPartnerId`, `pharmacyPartnerId`) enforced in application queries.
- **Alternatives considered:** Single users table with role column; true multi-tenant isolation (schema/DB-per-tenant + RLS).
- **Consequences:** Simple, but isolation depends entirely on correct query scoping — needs an audit and a shared guard pattern. Adding a new role = new table + portal.
- **Note (2026-06-17):** A multi-tenant pivot (Tenant = clinic/hospital org, `tenantId` + RLS) was proposed and then **rolled back** — not pursuing multi-tenancy yet. Staying single-org/multi-role. Revisit later if the product needs it.
- **Audit Note (2026-06-17):** An audit of `src/` files confirmed consistent application-level enforcement of partner-scoped queries using `providerId`, `ngoId`, `labPartnerId`, and `pharmacyPartnerId`. Explicit checks (e.g., `appointment.providerId !== session.providerId`) are in place to prevent cross-partner data leakage. The approach is robust for the current single-org/multi-role model.

## ADR-002: PostgreSQL on Neon via Prisma
- **Date:** 2026-06-17
- **Status:** Observed (confirm)
- **Context:** Relational domain with many FKs and transactional flows (booking/payment).
- **Decision:** PostgreSQL hosted on Neon, accessed through Prisma 6. `shadowDatabaseUrl` configured for migrations.
- **Alternatives considered:** _<MySQL, Mongo, other hosts — record if discussed>_
- **Consequences:** Strong relational integrity; serverless Postgres connection management matters on Vercel (use pooling). Backups present under `backups/`.

## ADR-003: No dedicated job queue — cron + backoff for async work
- **Date:** 2026-06-17
- **Status:** Observed (confirm)
- **Context:** Reminders, message sending, cleanup, payment reconciliation need async/retry.
- **Decision:** Use `/api/cron` route handlers plus `src/lib/fetchWithBackoff.ts`; idempotency via unique `WebhookEvent.eventId` / `OutboundMessage.messageId`. No BullMQ/SQS/Redis.
- **Alternatives considered:** Hosted queue (SQS), Redis + BullMQ.
- **Consequences:** Minimal infra; weaker delivery guarantees and observability for background work. Revisit if reliability becomes a launch blocker (P1 backlog: "Background jobs reliability").

## ADR-004: Money stored as integer paise (INR)
- **Date:** 2026-06-17
- **Status:** Observed (confirm)
- **Context:** Avoid floating-point currency errors; Razorpay uses smallest currency unit.
- **Decision:** All amounts are integer paise (`feePaise`, `amountPaise`, etc.), currency default `INR`.
- **Consequences:** Must format paise→₹ at the edges only (`src/lib/format.ts`). Never use floats for money.

## ADR-005: Razorpay for payments; Daily.co for video; Twilio/WhatsApp/Exotel for messaging
- **Date:** 2026-06-17
- **Status:** Accepted
- **Context:** India-focused telehealth needs local payments, video, and SMS/WhatsApp/voice.
- **Decision:** Razorpay (payments + webhooks), Daily.co (video rooms), Twilio Verify (OTP/SMS), WhatsApp, Exotel (audio calls).
- **Consequences:** Vendor coupling in `src/lib`; webhook idempotency required; keep credentials in env only.

## ADR-006: Pass-through middleware — auth enforced per-handler, not at the edge
- **Date:** 2026-06-29
- **Status:** Accepted
- **Context:** `middleware.ts` is a pass-through (`NextResponse.next()` for all paths). Auth was enforced inside route handlers and server components only.
- **Decision:** Keep auth at the handler level via `requireXxxSession()` helpers in `src/lib/auth.server.ts` and `src/lib/patientAuth.server.ts`. These helpers validate JWT AND do a DB lookup to verify the user still exists (prevents use of deleted-account tokens). Edge middleware cannot use Prisma, making per-handler auth the correct pattern for Next.js App Router with a Postgres-backed session model.
- **Alternatives considered:** Vercel Edge Middleware with JWT-only check (no DB lookup); would allow deleted accounts to access the system until token expiry.
- **Consequences:** Each request hits a serverless function before auth is checked (no edge rejection). Acceptable for v1. Revisit if unauthenticated traffic becomes a cost or DDoS concern.

## ADR-007: No dedicated job queue for v1 — cron + idempotency sufficient
- **Date:** 2026-06-29
- **Status:** Accepted
- **Context:** Async work includes appointment reminders, slot cleanup, and post-payment side effects (video room, notifications). No BullMQ/SQS/Redis in the stack.
- **Decision:** Retain cron + `fetchWithBackoff` + `OutboundMessage` dedup for v1. Payment side-effects use `withRetry` (3 attempts, linear back-off). Webhook idempotency via `WebhookEvent.eventId` (unique). Reminder dedup via `OutboundMessage.kind`.
- **Alternatives considered:** BullMQ (Redis), AWS SQS, Inngest.
- **Consequences:** Minimal infra. Weaker delivery guarantees than a queue. Acceptable for launch volume. Revisit if reminder failure rate exceeds 5% post-launch. (See also: cron bugs fixed in 2026-06-29 session — cleanup cron was broken, reminder window was too narrow.)

# System Patterns

> Technology stack choices, security guidelines, and API conventions.
> Source: `package.json`, `prisma/schema.prisma`, `src/lib`, `src/app/api`, config files.

## Technology Stack
- **Framework:** Next.js 16 (App Router) + React 19, TypeScript 5.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`).
- **Database:** PostgreSQL (hosted on **Neon** — see `backups/neon-*.dump`).
- **ORM:** Prisma 6 (`@prisma/client`); `prisma generate` runs on build & postinstall.
- **Auth:** JWT (`jsonwebtoken`) + `bcrypt`/`bcryptjs`; OTP via Twilio Verify.
- **Validation:** Zod 4.
- **Payments:** Razorpay.
- **Video:** Daily.co.
- **Messaging:** Twilio (SMS/Verify), WhatsApp, Exotel (audio).
- **Object storage:** AWS S3 (`@aws-sdk/client-s3`, presigned URLs).
- **PDF:** pdf-lib, pdfkit. **Maps:** Leaflet.
- **Monitoring:** Sentry (`@sentry/nextjs`; `sentry.*.config.ts`, `instrumentation*.ts`).
- **Mobile:** Expo / React Native app in `caldoc-app/` (EAS build).
- **Hosting:** Vercel (`vercel.json`, `.vercel/`). CI in `.github/workflows`.
- **Testing:** Vitest (unit, `src/lib/__tests__`), Playwright (e2e, `e2e/`).

## Key Conventions (observed)
- **App Router** under `src/app`; API routes under `src/app/api/<area>/route.ts`.
- **Shared logic in `src/lib/`** — auth (`auth.ts`, `auth.server.ts`, `patientAuth.server.ts`), tokens (`checkinToken`, `patientUploadToken`, `patientMobileToken`, `providerConfirmToken`), `db.ts` (Prisma singleton), `errors.ts`, integration clients (`razorpay`, `s3`, `twilioVerify`, `whatsapp`, `exotel`), pricing (`labPricing`, `rxDeliveryPricing`), `phone.ts`, `format.ts`.
- **Money is stored as integer paise** (`feePaise`, `amountPaise`, `defaultFeePaise`). Never use floats for currency. Currency defaults to INR.
- **IDs:** cuid (`@default(cuid())`).
- **State machines** tracked via history tables: `AppointmentStatusHistory`, `LabOrderEvent`, `RxOrderEvent`.
- **Idempotency/dedupe:** `WebhookEvent.eventId` and `OutboundMessage.messageId` are unique.
- **`middleware.ts` is currently a pass-through** (matches `/:path*`, returns `next()`). Auth is enforced inside routes/server components, not in middleware. `src/middleware_disabled.ts` exists (older/disabled variant).

## Security Guidelines
- **AuthN:** per-role tables with `passwordHash` (bcrypt); patients also use phone OTP (Twilio Verify) and `PatientOtp` (hashed OTP, attempts, expiry). Password resets via `PatientPasswordReset` tokens.
- **AuthZ:** role implied by which user table + portal; some tables carry a `role` string (e.g. `ProviderUser.role`, `NgoUser.role`, `LabUser.role`, `PharmacyUser.role`).
- **Scoping:** partner-scoped users (`labPartnerId`, `pharmacyPartnerId`, `providerId`, `ngoId`) must only see their own rows — enforce in queries (no DB-level RLS present). _Audit this is consistent everywhere._
- **Secrets:** `.env`, `.env.local` (not committed — see `.gitignore`). Never put secrets/keys/PHI in the repo or memory-bank.
- **Audit:** write to `AuditLog` for sensitive actions (actorId/actorType/action/meta).
- **PHI:** documents/prescriptions in S3 via presigned URLs; patient consent captured on records.

## API Conventions
- **Style:** Next.js Route Handlers (REST-ish) under `/api`. No central OpenAPI spec found — routes are the contract.
- **Areas:** `admin`, `appointments`, `auth`, `checkin`, `checkout`, `payments`, `webhooks`, `video`, `patient`, `provider(s)`, `ngo`, `labs`/`lab-orders`, `pharmacy`/`rx-orders`, `enroll`, `frontdesk`, `cron`, `contact`, `offline-requests`, `services`, `meta`.
- **Webhooks** (`/api/webhooks`) record to `WebhookEvent` for idempotency before processing.
- **Cron** jobs live under `/api/cron` (reminders/cleanup — confirm scheduler: Vercel cron vs external).
- **Error handling:** use `src/lib/errors.ts`; resilience helper `src/lib/fetchWithBackoff.ts`. _Backlog item: make error handling consistent across all routes._

## Background Work / Async
- No dedicated queue system (no BullMQ/SQS/Redis dependency observed). Async/retry handled via cron routes + `fetchWithBackoff`. _If reliability needs grow, see ADR-003._

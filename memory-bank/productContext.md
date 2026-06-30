# Product Context

> Core philosophy, telehealth domain & roles, and integrations.
> Source: code in `prisma/schema.prisma`, `src/app`, `src/lib`, and `docs/pm/PRODUCT_BRIEF.md`.

## Product Vision
- **Product name:** CalDoc (repo: `telemed-in`).
- **What it is:** A fast, reliable **telehealth platform for India** — booking, video/audio consultation, payments, prescriptions, and follow-up care (lab tests at home, Rx/medicine delivery).
- **Launch goal (v1):** booking + checkout reliability, provider/patient portal stability, fast UX on mobile networks, operational readiness (monitoring, backups, runbooks).

## Non-negotiables (from PRODUCT_BRIEF)
- No data loss.
- No broken auth flows.
- No silent payment failures.
- No uncached heavy assets on hot paths.

## North Star Metrics
- Booking conversion rate · appointment completion rate · payment success rate · P95 page/API latency · weekly active patients & providers.

## ⚠️ "Multi-tenancy" clarification
This is **multi-role / multi-portal**, NOT classic tenant-isolated SaaS.
There is **no `tenant_id` column or row-level isolation** in the schema. Instead there are
separate user/account tables per role, each with its own login portal:
_(Note: a multi-tenant pivot was proposed on 2026-06-17 and rolled back — not pursuing it yet. See ADR-001 note.)_
- `Patient` (OTP + password) → `/patient`, `/book`, `/checkout`, `/visit`, `/room`
- `ProviderUser` (belongs to a `Provider`) → `/provider`
- `AdminUser` → `/admin`
- `FrontDeskUser` → `/frontdesk`
- `NgoUser` (belongs to an `Ngo`) → `/ngo`
- `LabUser` (belongs to a `LabPartner`) → `/labs`
- `PharmacyUser` (belongs to a `PharmacyPartner`) → `/pharmacy`

→ The closest thing to a "tenant" is a **Provider**, **Ngo**, **LabPartner**, or
**PharmacyPartner** that scopes the rows its users may see. _Confirm intended isolation model._

## Domain Model (key entities)
- **Patient** — phone-unique, optional email/password, OTP login, consent tracking, addresses, documents.
- **Provider** — doctor; speciality, languages, license/registration, fee (`defaultFeePaise`), `visitModes`, `is24x7`, slug, clinics.
- **Slot** — provider availability window; `isBooked`, optional per-slot fee.
- **Appointment** — core entity. `status` (default `PENDING`), `visitMode` (default `VIDEO`), `videoRoom`, fee in paise/INR, consent fields, status history, links to payment, prescription, visit note, check-in form, lab/rx orders.
- **Payment** — gateway (Razorpay), amounts as **integer paise**, currency default INR; linked 1:1 to appointment / rxOrder / labOrder.
- **Prescription / VisitNote / CheckInForm** — clinical outputs per appointment (PDFs in S3).
- **LabOrder / LabPartner / LabUser** — labs-at-home; NABL cert, home collection, status events.
- **RxOrder / PharmacyPartner / PharmacyUser** — medicine delivery; drug license, courier tracking, status events.
- **Ngo / NgoUser / NgoReservation** — NGOs reserve slots/appointments for patients.
- **Enrollment flows** — `ProviderEnrollment`, `PharmacyEnrollment`, `LabEnrollment` (admin reviews → approve/reject).
- **Cross-cutting** — `AuditLog`, `WebhookEvent`, `OutboundMessage`, `OfflineRequest`, `Medication`.

## Core Workflows
1. **Booking → payment → consult:** patient picks provider/slot → checkout (Razorpay) → appointment confirmed → check-in form → video room (Daily.co) → visit note + prescription PDF.
2. **Follow-up fulfillment:** prescription → Rx delivery (pharmacy partner) and/or lab orders (lab partner, home collection).
3. **NGO-sponsored care:** NGO reserves a slot → appointment created on patient's behalf.
4. **Partner onboarding:** provider/pharmacy/lab self-enroll → admin approves.
5. **WhatsApp bot booking** — planned (see `docs/pm/WHATSAPP_BOT_BOOKING_PLAN.md`).

## Integrations
- **Video:** Daily.co (`@daily-co/daily-js`, `/api/video`, `src/lib/videoLinkHelpers.ts`).
- **Payments:** Razorpay (`src/lib/razorpay.ts`, `/api/payments`, `/api/checkout`); webhooks in `/api/webhooks`.
- **Messaging:** Twilio (SMS + Verify OTP — `src/lib/twilioVerify.ts`), WhatsApp (`src/lib/whatsapp.ts`), Exotel audio calls (`src/lib/exotel.ts`), email.
- **Storage:** AWS S3 (presigned URLs — `src/lib/s3.ts`) for documents, prescriptions, receipts, recordings.
- **Maps:** Leaflet / react-leaflet (clinic locations).
- **PDF:** pdf-lib / pdfkit (prescriptions, receipts).
- **Monitoring:** Sentry.
- **Mobile app:** `caldoc-app/` (Expo / React Native).

## Compliance & Privacy
- Indian telemedicine context; consent captured on appointments (`consentAt/Mode/Text/Type`) and patients.
- `AuditLog` for actor/action tracking. Legal pages exist: `/privacy`, `/terms`, `/compliance`, `/disclaimer`.
- _Confirm: applicable regulatory framework (Telemedicine Practice Guidelines 2020, DPDP Act), data retention, encryption requirements._

## Open Questions
- Intended isolation/tenancy model (see ⚠️ above).
- Is the Expo `caldoc-app` in active scope for v1 or web-first?

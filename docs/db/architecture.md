# CalDoc — Database Architecture Document

> Architectural decisions, patterns, known gaps, security posture, and production
> readiness checklist for the CalDoc PostgreSQL database.
> Reflects schema after migration `20261014000003_production_schema_hardening`.

---

## 1. Overview

| Item                | Value                                       |
|---------------------|---------------------------------------------|
| Database            | PostgreSQL (Neon serverless)                |
| ORM                 | Prisma 6                                    |
| ID format           | cuid (client-side, collision-resistant)     |
| Money format        | Integer paise (÷100 = ₹). Never floats.    |
| Timezone            | All DateTimes stored in UTC; displayed in Asia/Kolkata (IST = UTC+05:30) |
| Total models        | 42                                          |
| Total migrations    | 8 (as of 20261014000003)                    |

---

## 2. Architectural Decisions

### ADR-DB-001 — Integer Paise for All Money
**Decision:** All monetary values stored as `Int` in paise (1 INR = 100 paise).
**Rationale:** Eliminates floating-point rounding errors in currency calculations. Standard
practice in Indian fintech (Razorpay uses paise natively).
**Impact:** All pricing, fees, and amount fields carry the suffix `Paise`.

### ADR-DB-002 — Denormalized Patient Fields on Orders
**Decision:** `LabOrder` and `RxOrder` carry `patientName` and `patientPhone` as
non-nullable denormalized copies.
**Rationale:** Standalone orders (labs-at-home, rx-delivery) may be placed by
unregistered patients (`patientId` is nullable). Partner dispatch APIs always need
contact information regardless of whether a `Patient` record exists.
**Impact:** Patient name/phone changes do not retroactively update historical orders —
intentional, as orders represent a point-in-time contract.

### ADR-DB-003 — Loose Reference for Enrollment → Partner
**Decision:** `ProviderEnrollment.providerId`, `PharmacyEnrollment.pharmacyPartnerId`,
and `LabEnrollment.labPartnerId` are plain `String?` fields, not Prisma FK relations.
**Rationale:** Enrollment records are historical. If a partner entity is deleted (e.g.,
offboarded), the enrollment record should remain intact as an audit artifact.
**Impact:** No Prisma cascade. Application code looks up the partner separately.

### ADR-DB-004 — PharmacyFulfillment Coexists with RxOrder
**Decision:** `PharmacyFulfillment` (legacy delivery-opt flow) and `RxOrder` (patient-
initiated medicine ordering) are kept as separate models.
**Rationale:** `PharmacyFulfillment` tracks prescription package delivery at the
appointment level when `Appointment.deliveryOpt = DELIVERY/PICKUP`. `RxOrder` tracks
patient-initiated medicine ordering from a prescription. These are functionally distinct
and can occur on the same appointment.
**Impact:** Two separate fulfillment flows exist. Future unification is possible but
not required for v1.

### ADR-DB-005 — No Database-Level Row Security (RLS)
**Decision:** Row-level isolation is enforced in application code (route handlers),
not via PostgreSQL RLS policies.
**Rationale:** Prisma does not natively support RLS. Adding raw SQL RLS would require
Prisma shadow database maintenance complexity. All partner-scoped users (LabUser,
PharmacyUser, ProviderUser, NgoUser) are isolated via application-level WHERE clauses
(`WHERE labPartnerId = session.labPartnerId`).
**Risk:** A query written without the scope filter would leak cross-partner data.
**Mitigation:** All portal API routes use `requireXxxSession()` helpers that return the
scoped partner ID, and queries always include the scoping WHERE clause.
**Future:** Consider PostgreSQL RLS or a dedicated row-security library when the team
scales beyond 5 engineers.

### ADR-DB-006 — String Status Fields (No Prisma Enums)
**Decision:** All state-machine status fields use `String` rather than Prisma `enum`.
**Rationale:** Prisma enums generate native PostgreSQL ENUM types. Adding values to
a PG enum requires `ALTER TYPE ... ADD VALUE` which cannot be rolled back in a
transaction — dangerous for automated migrations. String columns allow forward-
compatible status additions.
**Risk:** Invalid status values can be written.
**Mitigation:** All valid values are documented in the Data Dictionary Appendix A.
Application-level validation (Zod) guards entry points. TypeScript union types in
route handlers prevent most invalid values.
**Future:** Add CHECK constraints at the DB level in a subsequent migration once the
status sets are stable.

### ADR-DB-007 — cuid for Primary Keys
**Decision:** All PKs use `@default(cuid())`.
**Rationale:** cuids are URL-safe, sortable by creation time, and generated client-side
(no round-trip for ID). They avoid sequential integer exposure in URLs.
**Consideration:** UUIDs (v7) would be an alternative but cuids are already consistent
across the codebase.

### ADR-DB-008 — Single Payment Per Order
**Decision:** Each `Payment` record links to exactly one order entity (appointment, Rx,
or lab) via nullable unique FK fields.
**Rationale:** Prevents double-charging. The `@unique` constraint on each FK ensures
one-to-one mapping. The `orderId` field (Razorpay order ID) is also unique, preventing
replay of webhook events.
**Impact:** Partial payments or split-billing are not supported in v1.

### ADR-DB-009 — Cron-Based Slot Generation + ProviderScheduleTemplate
**Decision:** Slots are pre-generated and stored as individual `Slot` rows by a cron
job (`/api/cron/generate-slots`). A new `ProviderScheduleTemplate` model defines the
recurring weekly windows.
**Rationale:** Pre-generated slots enable fast availability queries (single index scan
on `isBooked + startsAt`). Template-based generation decouples provider schedule config
from slot generation logic.
**Impact:** Cron job must read `ProviderScheduleTemplate` to determine which slots to
generate. This replaces hardcoded schedule logic in the cron route.
**TODO:** Update `generate-slots` cron to read from `ProviderScheduleTemplate` instead
of hardcoded hours.

---

## 3. Model Relationships Summary

| Relationship                     | Type   | Cascade Behavior              |
|----------------------------------|--------|-------------------------------|
| Provider → ProviderUser          | 1:N    | Cascade delete                |
| Provider → Slot                  | 1:N    | No cascade (slots linger)     |
| Provider → ProviderClinic        | 1:N    | Cascade delete                |
| Provider → ProviderScheduleTemplate | 1:N | Cascade delete               |
| Patient → Appointment            | 1:N    | No cascade (preserve history) |
| Patient → PatientAddress         | 1:N    | Cascade delete                |
| Patient → PatientDocument        | 1:N    | Cascade delete                |
| Patient → LabOrder               | 1:N    | Cascade delete                |
| Patient → RxOrder                | 1:N    | SetNull on delete             |
| Patient → FollowUpRequest        | 1:N    | Cascade delete                |
| Appointment → Payment            | 0:1    | No cascade                    |
| Appointment → Prescription       | 0:1    | Cascade delete                |
| Appointment → VisitNote          | 0:1    | Cascade delete                |
| Appointment → CheckInForm        | 0:1    | Cascade delete                |
| Appointment → PatientDocument    | 1:N    | Cascade delete                |
| Appointment → LabOrder           | 1:N    | Cascade delete                |
| Appointment → RxOrder            | 1:N    | SetNull on delete             |
| Appointment → FollowUpRequest    | 1:N    | Cascade delete                |
| Appointment → NgoReservation     | 0:1    | No cascade                    |
| Appointment → PharmacyFulfillment| 0:1    | Cascade delete                |
| Payment → RefundRequest          | 1:N    | Restrict delete               |
| LabOrder → LabOrderEvent         | 1:N    | Cascade delete                |
| LabOrder → FollowUpRequest       | 1:N    | SetNull on delete             |
| RxOrder → RxOrderItem            | 1:N    | Cascade delete                |
| RxOrder → RxOrderEvent           | 1:N    | Cascade delete                |
| Ngo → NgoUser                    | 1:N    | Cascade delete                |
| Ngo → NgoReservation             | 1:N    | Cascade delete                |
| LabPartner → LabUser             | 1:N    | No cascade                    |
| LabPartner → LabOrder            | 1:N    | No cascade                    |
| PharmacyPartner → PharmacyUser   | 1:N    | No cascade                    |
| PharmacyPartner → RxOrder        | 1:N    | SetNull on delete             |

---

## 4. Index Inventory

All indexes in the schema (post migration 20261014000003):

| Table                      | Index Fields                         | Type     | Purpose                          |
|----------------------------|--------------------------------------|----------|----------------------------------|
| Patient                    | phone                                | UQ       | Login lookup                     |
| Patient                    | email                                | UQ       | Login lookup                     |
| Provider                   | slug                                 | UQ       | URL routing                      |
| Slot                       | (providerId, startsAt)               | UQ       | Prevent duplicate slots          |
| Slot                       | (providerId, isBooked, startsAt)     | IDX      | Availability queries             |
| Appointment                | (providerId, createdAt)              | IDX      | Provider calendar                |
| Appointment                | (patientId, createdAt)               | IDX      | Patient history                  |
| Appointment                | status                               | IDX      | Status dashboard queries         |
| Payment                    | orderId                              | UQ       | Razorpay lookup                  |
| Payment                    | appointmentId                        | UQ       | 1:1 enforcement                  |
| Payment                    | rxOrderId                            | UQ       | 1:1 enforcement                  |
| Payment                    | labOrderId                           | UQ       | 1:1 enforcement                  |
| Payment                    | status                               | IDX      | Status queries                   |
| PatientAddress             | patientId                            | IDX      | Address list                     |
| PatientAddress             | contactPhone                         | IDX      | Phone-based lookup               |
| PatientDocument            | appointmentId                        | IDX      | Appointment documents            |
| PatientDocument            | patientId                            | IDX      | Patient document list            |
| PatientOtp                 | phoneCanonical                       | IDX      | OTP lookup                       |
| PatientOtp                 | last10                               | IDX      | Fuzzy phone lookup               |
| PatientOtp                 | expiresAt                            | IDX      | Expiry cleanup                   |
| PatientOtp                 | patientId                            | IDX      | Patient OTP queries              |
| AuditLog                   | (actorId, at)                        | IDX      | Actor audit trail                |
| AuditLog                   | at                                   | IDX      | Time-range queries               |
| AuditLog                   | action                               | IDX      | Action filter                    |
| WebhookEvent               | eventId                              | UQ       | Idempotency                      |
| WebhookEvent               | orderId                              | IDX      | Payment lookup                   |
| WebhookEvent               | (source, type)                       | IDX      | Source filter                    |
| ProviderUser               | email                                | UQ       | Login                            |
| ProviderUser               | providerId                           | IDX      | Portal queries                   |
| Ngo                        | slug                                 | IDX      |                                  |
| NgoReservation             | appointmentId                        | UQ       | 1:1 enforcement                  |
| NgoReservation             | friendlyId                           | UQ       | Human lookup                     |
| NgoReservation             | (ngoId, status)                      | IDX      | NGO dashboard                    |
| NgoReservation             | (providerId, status)                 | IDX      | Provider view                    |
| LabOrder                   | (status, createdAt)                  | IDX      | Lab partner dashboard            |
| LabOrder                   | (labPartnerId, status)               | IDX      | Partner-scoped queries           |
| LabOrder                   | (patientId, status)                  | IDX      | Patient portal                   |
| LabOrderEvent              | (labOrderId, createdAt)              | IDX      | Timeline                         |
| FollowUpRequest            | (patientId, status)                  | IDX      | Patient dashboard                |
| FollowUpRequest            | (status, dueAt)                      | IDX      | Cron reminder query              |
| FollowUpRequest            | appointmentId                        | IDX      | Provider view                    |
| LabUser                    | email                                | UQ       | Login                            |
| LabUser                    | labPartnerId                         | IDX      | Portal queries                   |
| PharmacyUser               | email                                | UQ       | Login                            |
| PharmacyUser               | pharmacyPartnerId                    | IDX      | Portal queries                   |
| RxOrder                    | patientId                            | IDX      | Patient portal                   |
| RxOrder                    | pharmacyPartnerId                    | IDX      | Partner portal                   |
| RxOrder                    | appointmentId                        | IDX      | Appointment linkage              |
| RxOrder                    | (status, createdAt)                  | IDX      | Status dashboard                 |
| RxOrderItem                | rxOrderId                            | IDX      | Order items                      |
| RxOrderEvent               | (rxOrderId, createdAt)               | IDX      | Timeline                         |
| OfflineRequest             | (status, createdAt)                  | IDX      | Admin dashboard                  |
| PharmacyPartner            | isActive                             | IDX      | Assignment queries               |
| LabPartner                 | isActive                             | IDX      | Assignment queries               |
| CheckInForm                | completedAt                          | IDX      |                                  |
| PatientPasswordReset       | token                                | UQ       | Reset lookup                     |
| PatientPasswordReset       | expiresAt                            | IDX      | Expiry cleanup                   |
| PatientPasswordReset       | patientId                            | IDX      | Per-patient reset queries        |
| RefundRequest              | paymentId                            | IDX      | Refund lookup                    |
| RefundRequest              | (status, createdAt)                  | IDX      | Admin refund dashboard           |
| ProviderScheduleTemplate   | (providerId, dayOfWeek)              | IDX      | Schedule lookup                  |
| ProviderScheduleTemplate   | (providerId, isActive)               | IDX      | Active schedule query            |
| ProviderEnrollment         | (status, createdAt)                  | IDX      | Admin review queue               |
| ProviderEnrollment         | email                                | IDX      | Duplicate detection              |
| AdminUser                  | email                                | UQ       | Login                            |
| FrontDeskUser              | email                                | UQ       | Login                            |
| Medication                 | name                                 | UQ       | Autocomplete / duplicate check   |

---

## 5. Security Posture

### 5.1 Authentication
- **Patients:** Phone OTP (Twilio Verify) or email+password (bcrypt). OTP hashed in
  `PatientOtp.otpHash`. Reset tokens hashed + expiring in `PatientPasswordReset`.
- **All portal users** (Provider, Admin, FrontDesk, NGO, Lab, Pharmacy): email + bcrypt.
- **Mobile app:** `Patient` authenticated via JWT (`signPatientMobileToken`), different
  from web cookie JWT.
- **Cron routes:** `requireCronAuth` — validates `CRON_SECRET` env var; rejects if unset
  or set to placeholder `dev-please-change` in production.

### 5.2 Authorization
- **Application-level scoping** (not DB RLS). Each portal session carries a scoped ID
  (`providerId`, `labPartnerId`, `pharmacyPartnerId`, `ngoId`) enforced in queries.
- **Edge middleware** (`middleware.ts`): JWT verification on all `/provider/*`,
  `/admin/*`, `/labs/*`, `/pharmacy/*`, `/ngo/*`, `/frontdesk/*`, `/patient/*` routes.
- **API routes**: Additional `require*Session()` call in each handler for defense in depth.

### 5.3 Data Privacy
- PHI (prescriptions, visit notes, documents) stored in S3 via presigned URLs.
- No PHI in migration files, environment files, or memory-bank.
- Consent captured on `Appointment` (consentAt, consentMode, consentText, consentType)
  and `Patient.consentAt`.

### 5.4 Webhook Security
- Razorpay webhooks: HMAC-SHA256 signature verified before processing.
  (`webhooks/razorpay/route.ts`)
- Lab/pharmacy webhooks: HMAC-verified using `LabPartner.webhookSecret` /
  `PharmacyPartner.webhookSecret`.
- Meta (WhatsApp) webhook: HMAC-SHA256 (`meta/webhook/route.ts`).
- `WebhookEvent.eventId @unique` prevents replay attacks.

---

## 6. Known Gaps and Backlog

### P0 (Production Blockers)

| Gap | Description | Mitigation |
|-----|-------------|------------|
| Status validation | Status fields are strings with no DB CHECK constraints | Zod validation at API boundaries; documented in Appendix A |
| Razorpay webhook: Rx/Lab payments | Webhook handles appointment payments but Rx/Lab payments only work via client-side confirm (POST /api/rx-orders/confirm, /api/lab-orders/confirm) | Idempotent client confirm + webhook will succeed if one reaches; monitor for failures |
| No session invalidation | JWT tokens have no revocation. Compromised tokens remain valid until expiry. | Short expiry (1h–24h); force logout by password reset clears nothing |
| AuditLog under-populated | Login events, payment captures, status changes not consistently written | AuditLog model exists; needs systematic use across all sensitive routes |

### P1 (Pre-Scale)

| Gap | Description | Recommendation |
|-----|-------------|----------------|
| LabPartner has serviceAreas but generate-slots cron is not reading ProviderScheduleTemplate | Cron hardcodes hours; templates are created but not yet consumed | Update `/api/cron/generate-slots` to read `ProviderScheduleTemplate` |
| No `NgoReservationEvent` | Status transitions for NGO reservations are not logged | Add `NgoReservationEvent` model in next migration |
| `LabOrderEvent.actorEmail` (not actorId) | Actor identified by email, not ID; cross-table join not possible | Migrate to actorId + actorType in a future migration |
| `RxOrderEvent.actorEmail` same issue | See above | Same recommendation |
| No admin role differentiation in practice | `AdminUser.role` added but route handlers still use `requireAdminSession()` without role check | Implement role-based checks in sensitive admin routes |
| Slot timezone bug | `generate-slots` creates slots at UTC hours (09:00–17:00 UTC = 14:30–22:30 IST) | Fix IST offset in cron; use `ProviderScheduleTemplate.startHour` as IST |
| No password change for lab/pharmacy users | `PharmacyUser` and `LabUser` have no forgot-password flow | Add `LabPasswordReset` + `PharmacyPasswordReset` models or use email-based reset |

### P2 (Post-Launch)

| Gap | Description |
|-----|-------------|
| No `PatientConsent` model | DPDP Act compliance would benefit from a dedicated consent table with purpose, version, timestamp, and withdrawal |
| No DB-level CHECK constraints | Status enums enforced only at app level |
| No connection pool config | Neon serverless handles pooling, but explicit Prisma `connection_limit` not set in DATABASE_URL |
| `FrontDeskUser` has no partner scope | FrontDesk sees all appointments; fine for v1 but needs clinic/branch scoping at scale |
| No soft-delete | Cancelled appointments and rejected orders are not archived; accidental hard-deletes would be unrecoverable |
| `Appointment.bookerPhone` not indexed | Used in analytics/ops queries; low priority |

---

## 7. Data Integrity Rules

The following invariants must be maintained by application code (no DB enforcement):

1. **Payment uniqueness**: Exactly one of `Payment.appointmentId`, `Payment.rxOrderId`,
   `Payment.labOrderId` must be non-null per Payment row. The others must be null.

2. **Slot booking**: When an Appointment transitions to `CONFIRMED`, `Slot.isBooked`
   must be set to `true` in the same transaction.

3. **Appointment fee**: `Appointment.feePaise` must match `Slot.feePaise` (if set) or
   `Provider.defaultFeePaise`. Set at booking time; not updated after confirmation.

4. **RxOrder amount**: For the quote flow, `RxOrder.amountPaise` must be set to
   `quotedAmountPaise` when patient confirms the quote (before payment).

5. **FollowUpRequest uniqueness**: Only one PENDING or NOTIFIED FollowUpRequest should
   exist per appointment at a time. The POST followup route expires any existing PENDING
   before creating a new one.

6. **NgoReservation → Appointment**: `NgoReservation.appointmentId` and
   `Appointment.ngoReservation` must stay in sync. Set together in the confirm-patient
   transaction.

7. **Enrollment → Partner**: `ProviderEnrollment.providerId` is set once on approval
   and should never be changed. Same for pharmacy and lab enrollments.

---

## 8. Production Readiness Checklist

### Database
- [ ] Run migration `20261014000003` on production Neon instance
- [ ] Verify `CRON_SECRET` is set in Vercel env + GitHub repo secrets
- [ ] Confirm `RZP_KEY`, `RZP_SECRET`, `RZP_WEBHOOK_SECRET` are in Vercel env
- [ ] Confirm `JWT_SECRET` and `PATIENT_JWT_SECRET` are strong (≥64 chars random)
- [ ] Confirm `DATABASE_URL` uses a Neon pooled connection string (pgBouncer)
- [ ] Confirm `SHADOW_DATABASE_URL` is a separate Neon branch (not same as DATABASE_URL)
- [ ] Remove unused env vars: `LABS_ALLOWED_EMAILS`, `LABS_PORTAL_DEFAULT_PASSWORD`

### Schema
- [ ] Update `generate-slots` cron to read `ProviderScheduleTemplate` records
- [ ] Verify all partner-scoped queries include the scoping WHERE clause (security audit)
- [ ] Write AuditLog entries on: patient login, payment capture, appointment cancel,
       provider offboard, admin actions on enrollments

### Backup & Recovery
- [ ] Neon point-in-time recovery enabled on production branch
- [ ] Neon daily backup exports configured (`backups/` script verified)
- [ ] Recovery runbook exists and has been tested

### Monitoring
- [ ] Sentry error alerts configured for payment failures and webhook errors
- [ ] Neon slow query log enabled (threshold: 500ms)
- [ ] Alert on `Payment.status = FAILED` accumulation
- [ ] Alert on `LabOrder.dispatchStatus = FAILED` accumulation

---

## 9. Migration History

| Migration                              | Purpose                                      |
|----------------------------------------|----------------------------------------------|
| 20261013000001_add_provider_gender     | Provider.gender field                        |
| 20261013000002_rxorder_appointment_link| RxOrder.appointmentId + back-relation        |
| 20261013000003_rx_quote_orchestration  | RxOrderItem, RxOrderEvent, quote fields      |
| 20261014000001_lab_order_scheduling    | LabOrder scheduling fields (scheduledFor, etc.)|
| 20261014000002_follow_up_requests      | FollowUpRequest model                        |
| **20261014000003_production_schema_hardening** | **This migration (see below)**      |

### What migration 20261014000003 changes

| Change | Type | Reason |
|--------|------|--------|
| `AdminUser.role` added | New field | Role-based admin access |
| `Provider.{offboardedAt, offboardedBy, offboardingReason, createdAt, updatedAt}` added | New fields | Offboarding audit trail + change tracking |
| `Appointment.paymentId` removed | Column drop | Legacy unused field; actual payment via `Payment.appointmentId` relation |
| `LabPartner.serviceAreas` added | New field | Postal code routing parity with PharmacyPartner |
| `Medication @@index([name])` dropped | Index drop | Redundant with @unique constraint |
| Indexes on `AuditLog`, `WebhookEvent`, `PatientDocument`, `PatientOtp`, `OfflineRequest`, `PatientPasswordReset`, `ProviderUser`, `LabUser`, `PharmacyUser` | New indexes | Performance for common query paths |
| `LabOrder @@index([patientId, status])` | New index | Patient portal lab order queries |
| `RefundRequest` model | New table | Payment refund tracking with gateway ID |
| `ProviderScheduleTemplate` model | New table | Recurring provider availability windows |

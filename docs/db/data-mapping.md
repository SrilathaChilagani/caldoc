# CalDoc — Data Mapping

> Entity relationships, data flows, and join paths for all primary domain areas.
> Reflects schema after migration `20261014000003_production_schema_hardening`.

---

## 1. Core Entity Map

```
Patient ──────────────────────────────────────────────────────────────────┐
  │ 1:N Appointment                                                        │
  │ 1:N PatientAddress                                                     │
  │ 1:N PatientDocument                                                    │
  │ 1:N PatientOtp                                                         │
  │ 1:N PatientPasswordReset                                               │
  │ 1:N LabOrder                                                           │
  │ 1:N RxOrder                                                            │
  └─────────────────────────────────────────────────────────────────────  │
                                                                           │
Provider ─────────────────────────────────────────────────────────────    │
  │ 1:N Appointment                                                  │     │
  │ 1:N Slot                                                         │     │
  │ 1:N ProviderClinic                                               │     │
  │ 1:N ProviderUser                                                 │     │
  │ 1:N NgoReservation                                               │     │
  │ 1:N FollowUpRequest                                              │     │
  └─ 1:N ProviderScheduleTemplate (NEW)                             │     │
                                                                    │     │
Slot ────────────────────────────────────────────────────────────── │ ───┘
  │ 1:N Appointment                                                  │
  └─ 1:N NgoReservation                                             │
                                                                    │
Appointment ────────────────────────────────────────────────────── ┘
  │ 0:1 Payment
  │ 0:1 PaymentReceipt
  │ 0:1 Prescription
  │ 0:1 VisitNote
  │ 0:1 CheckInForm
  │ 0:1 PharmacyFulfillment
  │ 0:1 NgoReservation
  │ 1:N AppointmentStatusHistory
  │ 1:N OutboundMessage
  │ 1:N PatientDocument
  │ 1:N LabOrder
  │ 1:N RxOrder
  └─ 1:N FollowUpRequest
```

---

## 2. Domain Flow Maps

### 2.1 Booking → Payment → Consultation

```
Patient selects Provider
      │
      ▼
   Slot (isBooked=false)
      │ booking
      ▼
 Appointment (PENDING)
      │
      ├── Patient pays ──► checkout/create-order ──► Payment (PENDING)
      │                         │
      │              Razorpay callback
      │                         │
      │              Payment (CAPTURED)
      │              Appointment (CONFIRMED)
      │              PaymentReceipt (S3 PDF)
      │              Slot.isBooked = true
      │
      ├── CheckInForm created (token-gated)
      │
      ├── Appointment (IN_PROGRESS) ──► video room created (Daily.co)
      │
      ├── Provider writes VisitNote + Prescription
      │
      └── Appointment (COMPLETED)
            │
            ├── LabOrder (if tests ordered)
            └── RxOrder (if medicines ordered)
```

Join path for a full consultation record:
```sql
Appointment
  JOIN Patient         ON Appointment.patientId = Patient.id
  JOIN Provider        ON Appointment.providerId = Provider.id
  JOIN Slot            ON Appointment.slotId = Slot.id              -- nullable
  JOIN Payment         ON Payment.appointmentId = Appointment.id    -- nullable
  JOIN PaymentReceipt  ON PaymentReceipt.appointmentId = Appointment.id  -- nullable
  JOIN Prescription    ON Prescription.appointmentId = Appointment.id    -- nullable
  JOIN VisitNote       ON VisitNote.appointmentId = Appointment.id        -- nullable
  JOIN CheckInForm     ON CheckInForm.appointmentId = Appointment.id      -- nullable
```

---

### 2.2 Lab Order Flow

```
Provider orders tests  (provider/appointments/[id]/labs)
      │
      ▼
LabOrder (PENDING, source=APPOINTMENT)
      │  OR
Patient orders direct (services/labs-at-home)
      ▼
LabOrder (AWAITING_PAYMENT, source=AT_HOME)
      │
      ├── Patient pays ──► lab-orders/create-order ──► Payment (PENDING, labOrderId)
      │               Razorpay callback
      │               Payment (CAPTURED)
      │               LabOrder (PENDING)
      │
      ├── Patient schedules collection ──► LabOrder (scheduledFor, collectionType, CONFIRMED)
      │
      ├── Lab partner collects sample ──► LabOrderEvent (SAMPLE_COLLECTED)
      │                                   LabOrder (SAMPLE_COLLECTED)
      │
      ├── In transit ──► LabOrderEvent (IN_TRANSIT)
      │
      └── Results uploaded ──► LabOrder (REPORTS_READY, resultsPdfKey)
                                LabOrderEvent (REPORTS_READY)
                                FollowUpRequest triggered (if AFTER_LAB_RESULTS type)
```

Join path for lab order with full context:
```sql
LabOrder
  JOIN Patient     ON LabOrder.patientId = Patient.id          -- nullable (standalone)
  JOIN Appointment ON LabOrder.appointmentId = Appointment.id  -- nullable
  JOIN LabPartner  ON LabOrder.labPartnerId = LabPartner.id    -- nullable
  JOIN Payment     ON Payment.labOrderId = LabOrder.id         -- nullable
```

---

### 2.3 Rx (Medicine) Order Flow

Two entry points:

**A. Appointment-linked (quote flow):**
```
Prescription created on Appointment
      │
      ▼
RxOrder (QUOTE_PENDING, amountPaise=0, appointmentId set)
      │
PharmacyPartner reviews + submits quote (pharmacy/rx-orders/[id]/quote)
      │
RxOrder (QUOTE_READY, quotedAmountPaise set, rxOrderItems priced)
      │
Patient confirms quote (patient/rx-orders/[id]/confirm)
      │
RxOrder (AWAITING_PAYMENT, amountPaise = quotedAmountPaise)
      │ Patient pays
      ▼
```

**B. Standalone delivery (direct pay flow):**
```
Patient submits items + address (services/rx-delivery)
      │
RxOrder (AWAITING_PAYMENT, amountPaise computed by rxDeliveryPricing)
      │ Patient pays
      ▼
```

**After payment (both paths):**
```
rx-orders/create-order ──► Payment (PENDING, rxOrderId)
Razorpay callback
Payment (CAPTURED)
RxOrder (PAID)
dispatchRxOrder() ──► PharmacyPartner API or MANUAL portal
      │
RxOrder (PROCESSING)
RxOrderEvent (PROCESSING)
      │
RxOrder (DISPATCHED, trackingNumber, courierName)
RxOrderEvent (DISPATCHED)
      │
RxOrder (DELIVERED)
```

Join path for rx order with items and partner:
```sql
RxOrder
  JOIN Patient        ON RxOrder.patientId = Patient.id                -- nullable
  JOIN Appointment    ON RxOrder.appointmentId = Appointment.id        -- nullable
  JOIN PharmacyPartner ON RxOrder.pharmacyPartnerId = PharmacyPartner.id -- nullable
  JOIN Payment        ON Payment.rxOrderId = RxOrder.id                -- nullable
  LEFT JOIN RxOrderItem ON RxOrderItem.rxOrderId = RxOrder.id
```

---

### 2.4 NGO Partner Flow

```
Ngo (admin-created)
  └── NgoUser (login)
        │
        ▼
NgoReservation (HELD, friendlyId, slotId, providerId)
      │
      ├── Admin confirms with patient ──► NgoReservation (CONFIRMED, appointmentId)
      │                                   Appointment (CONFIRMED)
      │
      ├── Admin invoices ──► /api/ngo/invoice (HTML report from NgoReservation data)
      │
      └── Admin releases ──► NgoReservation (RELEASED), Slot freed
```

Join path:
```sql
NgoReservation
  JOIN Ngo         ON NgoReservation.ngoId = Ngo.id
  JOIN Provider    ON NgoReservation.providerId = Provider.id
  JOIN Slot        ON NgoReservation.slotId = Slot.id          -- nullable
  JOIN Appointment ON NgoReservation.appointmentId = Appointment.id  -- nullable, @unique
```

---

### 2.5 Partner Enrollment & Onboarding

```
Applicant submits enrollment form
      │
      ▼
ProviderEnrollment / PharmacyEnrollment / LabEnrollment (PENDING)
      │
Admin reviews
      │
      ├── Approve ──► Provider / PharmacyPartner / LabPartner created
      │               *Enrollment.providerId / pharmacyPartnerId / labPartnerId set
      │               ProviderUser / PharmacyUser / LabUser created (temp password)
      │               WhatsApp notification sent
      │
      └── Reject  ──► Enrollment (REJECTED, rejectionReason, reviewedAt, reviewedByEmail)
```

Note: `*Enrollment.providerId` / `pharmacyPartnerId` / `labPartnerId` are loose string
references (not Prisma FK relations) to preserve enrollment records even if the partner
entity is later deleted.

---

### 2.6 Follow-Up Flow

```
Provider creates FollowUpRequest on Appointment
      │ type=TIMED:             dueAt computed from daysUntilDue
      │ type=AFTER_LAB_RESULTS: dueAt set when lab results arrive
      │
FollowUpRequest (PENDING)
      │
      ├── TIMED: cron/follow-up-reminders (daily 7am IST)
      │          WhatsApp if dueAt ≤ now+48h ──► FollowUpRequest (NOTIFIED)
      │          Expire if overdue >7 days  ──► FollowUpRequest (EXPIRED)
      │
      ├── AFTER_LAB_RESULTS: labs/orders/[id]/results upload
      │          ──► FollowUpRequest (NOTIFIED, dueAt=now)
      │
      ├── Patient books follow-up ──► FollowUpRequest (BOOKED)
      │
      └── Patient dismisses ──► FollowUpRequest (DISMISSED)
```

Join path:
```sql
FollowUpRequest
  JOIN Appointment ON FollowUpRequest.appointmentId = Appointment.id
  JOIN Patient     ON FollowUpRequest.patientId = Patient.id
  JOIN Provider    ON FollowUpRequest.providerId = Provider.id
  LEFT JOIN LabOrder ON FollowUpRequest.labOrderId = LabOrder.id  -- nullable
```

---

### 2.7 Payment Entity Map

```
Payment (id, orderId[Razorpay], gateway, amount, currency, status)
  │
  ├── appointmentId ──► Appointment  (0:1 — standard consultation)
  ├── rxOrderId     ──► RxOrder      (0:1 — medicine delivery)
  ├── labOrderId    ──► LabOrder     (0:1 — lab tests)
  └── refundRequests ──► RefundRequest[] (NEW — 1:N)
```

Exactly one of `appointmentId`, `rxOrderId`, `labOrderId` is set per Payment row.
The `orderId` field holds the Razorpay order ID used for HMAC verification.

---

### 2.8 Provider Availability

```
Provider
  └── ProviderScheduleTemplate (NEW — recurring windows per dayOfWeek)
        │ used by generate-slots cron
        ▼
      Slot (startsAt, endsAt, isBooked, feePaise)
        │
        └── Appointment (via slotId)
```

---

### 2.9 Audit Trail Map

Every sensitive action writes to **AuditLog** with `actorId + actorType + action + meta`.
State machines use domain-specific event tables:

| Domain         | Event Table                  | Fields                                      |
|----------------|------------------------------|---------------------------------------------|
| Appointment    | AppointmentStatusHistory     | fromStatus, toStatus, actorType, actorId, reason |
| Lab Order      | LabOrderEvent                | fromStatus, toStatus, actorEmail, note      |
| Rx Order       | RxOrderEvent                 | fromStatus, toStatus, actorEmail, trackingNumber |
| Notifications  | OutboundMessage              | channel, template, status, messageId        |
| Webhooks       | WebhookEvent                 | source, eventId, type, payload              |
| Refunds        | RefundRequest (NEW)          | paymentId, amount, reason, gatewayRefundId  |

---

## 3. Multi-Portal User Map

| Portal     | User Table      | Scoped to       | Auth Method         |
|------------|-----------------|-----------------|---------------------|
| /patient   | Patient         | self            | Phone OTP + password|
| /provider  | ProviderUser    | Provider        | Email + bcrypt      |
| /admin     | AdminUser       | global          | Email + bcrypt      |
| /frontdesk | FrontDeskUser   | global          | Email + bcrypt      |
| /ngo       | NgoUser         | Ngo             | Email + bcrypt      |
| /labs      | LabUser         | LabPartner      | Email + bcrypt      |
| /pharmacy  | PharmacyUser    | PharmacyPartner | Email + bcrypt      |

All portal routes are protected by `middleware.ts` (Edge JWT verify) plus in-handler
session validation (`requireProviderSession`, `requirePharmacySession`, etc.).

---

## 4. S3 Document Key Map

| Field / Model                  | S3 Key Purpose                                 |
|-------------------------------|------------------------------------------------|
| Patient.profilePhotoKey        | Patient profile photo                          |
| Provider.profilePhotoKey       | Provider profile photo                         |
| Provider.licenseDocKey         | License document (enrollment)                  |
| Provider.registrationDocKey    | Registration certificate                       |
| Prescription.pdfKey            | Generated prescription PDF                     |
| VisitNote (text field only)    | Notes stored in DB, no S3 key                  |
| CheckInForm.s3Key              | Completed check-in PDF (optional)              |
| Appointment.recordingKey       | Daily.co recording                             |
| PatientDocument.key            | Patient-uploaded documents per appointment     |
| LabOrder.resultsPdfKey         | Lab results PDF uploaded by partner            |
| RxOrder.rxDocumentKey          | Prescription document for medicine order       |
| PaymentReceipt.key             | Payment receipt PDF                            |
| ProviderEnrollment.profilePhotoKey / qualificationDocKey / registrationDocKey | Enrollment documents |

All keys are AWS S3 object keys. Access is via presigned URLs (`src/lib/s3.ts`).

# CalDoc — Data Dictionary

> Every model and field in `prisma/schema.prisma` documented with type, constraints,
> valid values, and purpose.
> Reflects schema after migration `20261014000003_production_schema_hardening`.
> Total models: **42** (40 original + RefundRequest + ProviderScheduleTemplate).

---

## Conventions

| Convention        | Meaning                                                      |
|-------------------|--------------------------------------------------------------|
| PK                | Primary key (`@id`)                                          |
| FK                | Foreign key (`@relation`)                                    |
| UQ                | Unique constraint (`@unique`)                                |
| IDX               | Non-unique index (`@@index`)                                 |
| nullable          | `String?` / `Int?` — may be NULL                             |
| paise             | Money stored as integer Indian paise (÷100 = ₹)             |
| cuid              | Default ID format: `@default(cuid())`                        |
| enum-str          | String field with a fixed set of valid values (documented)   |

---

## 1. Patient

Core patient identity. Auth via OTP (phone) or password (email).

| Field            | Type       | Constraints | Notes                                         |
|------------------|------------|-------------|-----------------------------------------------|
| id               | String     | PK, cuid    |                                               |
| name             | String     |             | Full name                                     |
| phone            | String     | UQ          | Primary identifier; stored with country code  |
| email            | String?    | UQ          | Optional; used for email+password login       |
| passwordHash     | String?    |             | bcrypt hash; null if OTP-only                 |
| dob              | DateTime?  |             | Date of birth                                 |
| sex              | String?    |             | Gender/sex — free text for now                |
| consentAt        | DateTime?  |             | First platform consent timestamp              |
| profilePhotoKey  | String?    |             | S3 key for profile photo                      |
| createdAt        | DateTime   | default now |                                               |

Relations: `appointments[]`, `addresses[]`, `documents[]`, `otps[]`, `labOrders[]`,
`rxOrders[]`, `passwordResets[]`, `followUpRequests[]`

---

## 2. Provider

Doctor / healthcare provider entity.

| Field              | Type      | Constraints    | Notes                                              |
|--------------------|-----------|----------------|----------------------------------------------------|
| id                 | String    | PK, cuid       |                                                    |
| name               | String    |                | Full name with title                               |
| speciality         | String    |                | e.g. "General Medicine", "Cardiology"              |
| languages          | String[]  |                | ISO 2-letter codes e.g. ["en","hi","te"]            |
| licenseNo          | String    |                | Medical council license number                     |
| is24x7             | Boolean   | default false  | Accepts bookings outside slot hours                |
| slug               | String    | UQ, max 120    | URL-safe identifier; used in booking URLs          |
| councilName        | String?   |                | Medical council name                               |
| qualification      | String?   |                | e.g. "MBBS, MD"                                    |
| registrationNumber | String?   |                | Registration number (may differ from licenseNo)    |
| isActive           | Boolean   | default true   | False = cannot be booked                           |
| licenseDocKey      | String?   |                | S3 key for license document                        |
| profilePhotoKey    | String?   |                | S3 key for profile photo                           |
| registrationDocKey | String?   |                | S3 key for registration certificate                |
| phone              | String?   |                | Contact phone                                      |
| gender             | String?   |                | enum-str: "Male", "Female", "Other"                |
| defaultFeePaise    | Int       | default 100    | Consultation fee in paise; 100 = ₹1               |
| visitModes         | String[]  | default []     | enum-str array: ["VIDEO","IN_PERSON","AUDIO"]      |
| offboardedAt       | DateTime? |                | When provider was deactivated                      |
| offboardedBy       | String?   |                | actorId (AdminUser.id) who offboarded              |
| offboardingReason  | String?   |                | Reason for offboarding                             |
| createdAt          | DateTime  | default now    |                                                    |
| updatedAt          | DateTime  | @updatedAt     |                                                    |

Relations: `appointments[]`, `slots[]`, `clinics[]`, `users[]`, `ngoReservations[]`,
`followUpRequests[]`, `scheduleTemplates[]`

---

## 3. ProviderClinic

Physical clinic address for a provider (in-person visits).

| Field        | Type      | Constraints    | Notes                          |
|--------------|-----------|----------------|--------------------------------|
| id           | String    | PK, cuid       |                                |
| providerId   | String    | FK→Provider, IDX |                              |
| clinicName   | String    |                |                                |
| addressLine1 | String    |                |                                |
| addressLine2 | String?   |                |                                |
| city         | String    | IDX            |                                |
| state        | String    |                |                                |
| pincode      | String    | IDX            |                                |
| lat          | Float?    |                | Latitude for map display       |
| lng          | Float?    |                | Longitude                      |
| phone        | String?   |                | Clinic phone                   |
| isActive     | Boolean   | default true   |                                |
| createdAt    | DateTime  | default now    |                                |
| updatedAt    | DateTime  | @updatedAt     |                                |

---

## 4. Slot

Provider availability window; one row = one bookable time slot.

| Field      | Type      | Constraints                 | Notes                                      |
|------------|-----------|-----------------------------|--------------------------------------------|
| id         | String    | PK, cuid                    |                                            |
| providerId | String    | FK→Provider, IDX composite  |                                            |
| startsAt   | DateTime  | UQ with providerId          |                                            |
| endsAt     | DateTime  |                             |                                            |
| isBooked   | Boolean   | default false, IDX          | Set to true when Appointment confirmed     |
| feePaise   | Int?      |                             | Per-slot override; null = use Provider.defaultFeePaise |

Unique constraint: `(providerId, startsAt)` — one slot per provider per start time.
Index: `(providerId, isBooked, startsAt)` — availability queries.

---

## 5. Appointment

Central entity. Represents one booked consultation.

| Field                   | Type      | Constraints        | Notes                                              |
|-------------------------|-----------|--------------------|----------------------------------------------------|
| id                      | String    | PK, cuid           |                                                    |
| patientId               | String    | FK→Patient, IDX    |                                                    |
| patientName             | String?   |                    | Denormalized snapshot at booking time              |
| providerId              | String    | FK→Provider, IDX   |                                                    |
| slotId                  | String?   | FK→Slot            | Null for emergency/walk-in appointments            |
| status                  | String    | default PENDING, IDX | enum-str (see below)                            |
| videoRoom               | String?   |                    | Daily.co room name                                 |
| recordingKey            | String?   |                    | S3 key for video recording                         |
| deliveryOpt             | String?   |                    | enum-str: "PICKUP" \| "DELIVERY" \| null           |
| createdAt               | DateTime  | default now        |                                                    |
| updatedAt               | DateTime  | @updatedAt         |                                                    |
| waError                 | String?   |                    | Last WhatsApp send error                           |
| waStatus                | String?   |                    | Last WhatsApp message status                       |
| consentAt               | DateTime? |                    | Telemedicine consent timestamp                     |
| consentMode             | String?   |                    | How consent was given                              |
| consentText             | String?   |                    | Consent text presented to patient                  |
| consentType             | String?   |                    | Type of consent                                    |
| deliveryAddressId       | String?   | FK→PatientAddress  | Linked delivery address                            |
| deliveryAddressSnapshot | Json?     |                    | Address snapshot at booking (survives address edits)|
| uploadLinkSentAt        | DateTime? |                    | When document upload link was sent                 |
| visitMode               | String?   | default VIDEO      | enum-str: "VIDEO" \| "IN_PERSON" \| "AUDIO"        |
| feePaise                | Int?      |                    | Final agreed fee in paise                          |
| feeCurrency             | String?   | default INR        |                                                    |
| bookerPhone             | String?   |                    | Phone of whoever booked (may differ from patient)  |

**Appointment.status valid values:**
`PENDING` → `CONFIRMED` → `IN_PROGRESS` → `COMPLETED`
Also: `CANCELLED`, `NO_SHOW`

Indexes: `(providerId, createdAt)`, `(patientId, createdAt)`, `(status)`

Relations: `patient`, `provider`, `slot`, `statusHistory[]`, `ngoReservation`,
`messages[]`, `patientDocuments[]`, `payment`, `paymentReceipt`, `pharmacyFulfillment`,
`prescription`, `visitNote`, `labOrders[]`, `rxOrders[]`, `checkInForm`, `followUpRequests[]`

---

## 6. Payment

One payment record per transaction. Exactly one of the `*Id` FK fields is set.

| Field         | Type      | Constraints           | Notes                                              |
|---------------|-----------|-----------------------|----------------------------------------------------|
| id            | String    | PK, cuid              |                                                    |
| gateway       | String    |                       | "RAZORPAY" (only gateway currently)                |
| orderId       | String    | UQ                    | Razorpay order ID (used for HMAC signature verify) |
| paymentRef    | String?   |                       | Razorpay payment ID after capture                  |
| amount        | Int       |                       | Amount in paise                                    |
| currency      | String    | default INR           |                                                    |
| status        | String    | IDX                   | enum-str: PENDING \| CAPTURED \| FAILED \| REFUNDED |
| appointmentId | String?   | UQ, FK→Appointment    | Set for consultation payments                      |
| rxOrderId     | String?   | UQ, FK→RxOrder        | Set for medicine delivery payments                 |
| labOrderId    | String?   | UQ, FK→LabOrder       | Set for lab test payments                          |
| receiptUrl    | String?   |                       | Public URL of PDF receipt (S3)                     |
| createdAt     | DateTime  | default now           |                                                    |
| updatedAt     | DateTime  | @updatedAt            |                                                    |

Relations: `appointment`, `rxOrder`, `labOrder`, `refundRequests[]`

---

## 7. PatientAddress

Saved delivery addresses for a patient.

| Field        | Type      | Constraints              | Notes                     |
|--------------|-----------|--------------------------|---------------------------|
| id           | String    | PK, cuid                 |                           |
| patientId    | String    | FK→Patient, IDX          |                           |
| label        | String?   |                          | e.g. "Home", "Office"     |
| contactName  | String?   |                          |                           |
| contactPhone | String?   | IDX                      |                           |
| line1        | String    |                          |                           |
| line2        | String?   |                          |                           |
| city         | String    |                          |                           |
| state        | String    |                          |                           |
| postalCode   | String    |                          |                           |
| instructions | String?   |                          | Delivery instructions     |
| savedAt      | DateTime  | default now              |                           |
| updatedAt    | DateTime  | @updatedAt               |                           |
| lastUsedAt   | DateTime? |                          | Updated on each use       |

---

## 8. PatientDocument

Documents uploaded by a patient during an appointment.

| Field        | Type      | Constraints              | Notes                     |
|--------------|-----------|--------------------------|---------------------------|
| id           | String    | PK, cuid                 |                           |
| appointmentId| String    | FK→Appointment, IDX      |                           |
| patientId    | String    | FK→Patient, IDX          |                           |
| key          | String    |                          | S3 object key             |
| fileName     | String    |                          | Original filename         |
| contentType  | String?   |                          | MIME type                 |
| createdAt    | DateTime  | default now              |                           |

---

## 9. PatientOtp

OTP records for phone-based login. Hashed for security.

| Field          | Type      | Constraints  | Notes                                        |
|----------------|-----------|--------------|----------------------------------------------|
| id             | String    | PK, cuid     |                                              |
| patientId      | String?   | FK→Patient, IDX | Null before patient exists (new registration)|
| phoneRaw       | String    |              | Phone as entered                             |
| phoneCanonical | String    | IDX          | Normalized form (+91XXXXXXXXXX)              |
| last10         | String    | IDX          | Last 10 digits for fuzzy matching            |
| otpHash        | String    |              | bcrypt hash of OTP                           |
| expiresAt      | DateTime  | IDX          | OTP expiry (typically 10 minutes)            |
| attempts       | Int       | default 0    | Verify attempts; throttled at max            |
| lastSentAt     | DateTime  | default now  |                                              |
| createdAt      | DateTime  | default now  |                                              |
| usedAt         | DateTime? |              | Set when OTP is successfully verified        |

---

## 10. Prescription

Doctor-generated prescription PDF, one per appointment.

| Field        | Type      | Constraints        | Notes                 |
|--------------|-----------|--------------------|-----------------------|
| id           | String    | PK, cuid           |                       |
| appointmentId| String    | UQ, FK→Appointment |                       |
| pdfKey       | String    |                    | S3 key for PDF        |
| meds         | Json      |                    | Array of `{name, sig, qty}` objects |
| createdAt    | DateTime  | default now        |                       |

---

## 11. VisitNote

Provider clinical notes per appointment.

| Field        | Type      | Constraints        | Notes                         |
|--------------|-----------|--------------------|-------------------------------|
| id           | String    | PK, cuid           |                               |
| appointmentId| String    | UQ, FK→Appointment |                               |
| text         | String    |                    | Full note text (no S3, in DB) |
| createdAt    | DateTime  | default now        |                               |
| updatedAt    | DateTime  | @updatedAt         |                               |

---

## 12. CheckInForm

Pre-consultation check-in form data.

| Field          | Type      | Constraints        | Notes                               |
|----------------|-----------|--------------------|-------------------------------------|
| id             | String    | PK, cuid           |                                     |
| appointmentId  | String    | UQ, FK→Appointment |                                     |
| s3Key          | String?   |                    | PDF of completed form (optional)    |
| chiefComplaint | String?   |                    | Primary reason for visit            |
| completedAt    | DateTime? | IDX                | When patient submitted the form     |
| createdAt      | DateTime  | default now        |                                     |
| updatedAt      | DateTime  | @updatedAt         |                                     |

---

## 13. AppointmentStatusHistory

Immutable log of every status transition for an appointment.

| Field        | Type      | Constraints              | Notes                                |
|--------------|-----------|--------------------------|--------------------------------------|
| id           | String    | PK, cuid                 |                                      |
| appointmentId| String    | FK→Appointment, IDX+at   |                                      |
| fromStatus   | String    |                          |                                      |
| toStatus     | String    |                          |                                      |
| actorType    | String    |                          | "PATIENT" \| "PROVIDER" \| "ADMIN" \| "SYSTEM" |
| actorId      | String?   |                          | ID from the relevant user table      |
| reason       | String?   |                          | Cancellation reason, etc.            |
| createdAt    | DateTime  | default now              |                                      |

---

## 14. Payment Receipt

One PDF receipt per appointment payment.

| Field        | Type      | Constraints             | Notes              |
|--------------|-----------|-------------------------|--------------------|
| appointmentId| String    | PK, FK→Appointment      | Shares PK with FK  |
| key          | String    |                         | S3 key for PDF     |
| createdAt    | DateTime  | default now             |                    |

---

## 15. AuditLog

Append-only cross-cutting audit trail.

| Field     | Type      | Constraints            | Notes                                             |
|-----------|-----------|------------------------|---------------------------------------------------|
| id        | String    | PK, cuid               |                                                   |
| actorId   | String?   | IDX composite with at  | ID from whichever user table; null = system       |
| actorType | String    |                        | "PATIENT" \| "PROVIDER" \| "ADMIN" \| "PHARMACY" \| "LAB" \| "FRONTDESK" \| "NGO" \| "SYSTEM" |
| action    | String    | IDX                    | Dot-notation e.g. "appointment.cancel", "payment.capture" |
| meta      | Json      |                        | Context-specific payload                          |
| at        | DateTime  | IDX, IDX composite     | default now                                       |

---

## 16. WebhookEvent

Idempotency store for incoming webhook payloads.

| Field     | Type      | Constraints     | Notes                                       |
|-----------|-----------|-----------------|---------------------------------------------|
| id        | String    | PK, cuid        |                                             |
| source    | String    | IDX composite   | "RAZORPAY" \| "META" \| "LAB" \| "PHARMACY" |
| eventId   | String    | UQ              | Gateway-provided unique ID; prevents replay |
| type      | String    | IDX composite   | e.g. "payment.captured"                     |
| orderId   | String?   | IDX             | Razorpay order ID for lookup                |
| payload   | Json      |                 | Full raw payload                            |
| createdAt | DateTime  | default now     |                                             |

---

## 17. OutboundMessage

Record of every notification sent to patients/providers.

| Field        | Type      | Constraints             | Notes                                      |
|--------------|-----------|-------------------------|--------------------------------------------|
| id           | String    | PK, cuid                |                                            |
| appointmentId| String?   | FK→Appointment, IDX     |                                            |
| channel      | String    |                         | "WHATSAPP" \| "SMS" \| "EMAIL"             |
| toPhone      | String?   |                         |                                            |
| toEmail      | String?   |                         |                                            |
| template     | String?   |                         | WhatsApp template name                     |
| body         | String?   |                         | Free-text message body                     |
| messageId    | String?   | UQ                      | Gateway message ID; enables status updates |
| status       | String    |                         | "SENT" \| "DELIVERED" \| "READ" \| "FAILED"|
| error        | String?   |                         | Last error message                         |
| kind         | String?   |                         | Semantic category e.g. "reminder", "confirmation" |
| createdAt    | DateTime  | default now             |                                            |

---

## 18. ProviderUser

Login credentials for a provider's portal user.

| Field       | Type      | Constraints            | Notes                          |
|-------------|-----------|------------------------|--------------------------------|
| id          | String    | PK, cuid               |                                |
| providerId  | String    | FK→Provider, IDX       |                                |
| email       | String    | UQ                     |                                |
| passwordHash| String    |                        | bcrypt                         |
| role        | String    | default "admin"        | "admin" (single role for now)  |
| createdAt   | DateTime  | default now            |                                |

---

## 19. AdminUser

Platform admin login.

| Field       | Type      | Constraints  | Notes                                          |
|-------------|-----------|--------------|------------------------------------------------|
| id          | String    | PK, cuid     |                                                |
| email       | String    | UQ           |                                                |
| passwordHash| String    |              | bcrypt                                         |
| role        | String    | default SUPER_ADMIN | enum-str: "SUPER_ADMIN" \| "SUPPORT" \| "FINANCE" |
| createdAt   | DateTime  | default now  |                                                |

---

## 20. FrontDeskUser

Front-desk staff login (reschedule, check status).

| Field       | Type      | Constraints  | Notes     |
|-------------|-----------|--------------|-----------|
| id          | String    | PK, cuid     |           |
| email       | String    | UQ           |           |
| passwordHash| String    |              | bcrypt    |
| name        | String?   |              |           |
| createdAt   | DateTime  | default now  |           |

---

## 21. Ngo

Non-governmental organisation partner entity.

| Field        | Type      | Constraints   | Notes                          |
|--------------|-----------|---------------|--------------------------------|
| id           | String    | PK, cuid      |                                |
| name         | String    |               |                                |
| slug         | String    | UQ, IDX       | URL identifier                 |
| contactEmail | String?   |               |                                |
| contactPhone | String?   |               |                                |
| description  | String?   |               |                                |
| isActive     | Boolean   | default true  |                                |
| billingNotes | String?   |               | Internal billing configuration |
| createdAt    | DateTime  | default now   |                                |
| updatedAt    | DateTime  | @updatedAt    |                                |

---

## 22. NgoUser

NGO portal user.

| Field       | Type      | Constraints       | Notes                    |
|-------------|-----------|-------------------|--------------------------|
| id          | String    | PK, cuid          |                          |
| ngoId       | String    | FK→Ngo (cascade)  |                          |
| email       | String    | UQ                |                          |
| passwordHash| String    |                   | bcrypt                   |
| role        | String    | default ADMIN     | "ADMIN" \| "VIEWER"      |
| createdAt   | DateTime  | default now       |                          |

---

## 23. NgoReservation

A slot held by an NGO for future patient assignment.

| Field        | Type      | Constraints                 | Notes                                       |
|--------------|-----------|-----------------------------|---------------------------------------------|
| id           | String    | PK, cuid                    |                                             |
| ngoId        | String    | FK→Ngo (cascade), IDX       |                                             |
| providerId   | String    | FK→Provider, IDX            |                                             |
| slotId       | String?   | FK→Slot                     | Nullable for floating reservations          |
| appointmentId| String?   | UQ, FK→Appointment          | Set when patient is confirmed               |
| friendlyId   | String    | UQ                          | Human-readable booking reference            |
| speciality   | String?   |                             |                                             |
| notes        | String?   |                             |                                             |
| status       | String    | default HELD, IDX           | enum-str: HELD \| CONFIRMED \| RELEASED \| EXPIRED \| CANCELLED |
| amountPaise  | Int?      |                             | Charge to NGO for this reservation          |
| createdAt    | DateTime  | default now                 |                                             |
| updatedAt    | DateTime  | @updatedAt                  |                                             |
| confirmedAt  | DateTime? |                             | When patient was confirmed                  |

---

## 24. PharmacyFulfillment

Tracks delivery status of appointment-linked prescriptions (legacy delivery-opt flow).

| Field        | Type      | Constraints              | Notes                                          |
|--------------|-----------|--------------------------|------------------------------------------------|
| id           | String    | PK, cuid                 |                                                |
| status       | String    | default READY            | enum-str: READY \| PACKED \| SHIPPED \| DELIVERED \| SENT |
| notes        | String?   |                          |                                                |
| appointmentId| String?   | UQ, FK→Appointment       |                                                |
| createdAt    | DateTime  | Timestamptz, default now |                                                |
| updatedAt    | DateTime  | Timestamptz, @updatedAt  |                                                |

Note: This model covers the `Appointment.deliveryOpt` flow where a pharmacy physically
delivers the prescription package. Distinct from `RxOrder` which is patient-initiated
medicine ordering.

---

## 25. LabOrder

A lab test order — either appointment-ordered or standalone at-home booking.

| Field                | Type      | Constraints              | Notes                                             |
|----------------------|-----------|--------------------------|---------------------------------------------------|
| id                   | String    | PK, cuid                 |                                                   |
| appointmentId        | String?   | FK→Appointment (cascade) |                                                   |
| patientId            | String?   | FK→Patient (cascade), IDX composite |                                       |
| patientName          | String?   |                          | Denormalized; needed for standalone orders        |
| patientPhone         | String?   |                          | Denormalized; needed for dispatch                 |
| patientEmail         | String?   |                          |                                                   |
| deliveryMode         | String?   |                          | Deprecated — use collectionType                   |
| tests                | Json?     |                          | Array of `{name, qty}` or strings                 |
| notes                | String?   |                          |                                                   |
| status               | String    | default PENDING, IDX     | enum-str (see below)                              |
| address              | Json?     |                          | Collection address `{line1, city, state, postalCode}` |
| amountPaise          | Int?      |                          | Order amount in paise                             |
| source               | String    | default APPOINTMENT      | "APPOINTMENT" \| "AT_HOME"                        |
| collectionAgentName  | String?   |                          | Field phlebotomist / collection agent name        |
| collectionAgentPhone | String?   |                          |                                                   |
| resultsPdfKey        | String?   |                          | S3 key for results PDF                            |
| labPartnerId         | String?   | FK→LabPartner, IDX       |                                                   |
| scheduledFor         | DateTime? |                          | Patient-chosen collection date/time               |
| collectionType       | String?   |                          | "HOME" \| "WALK_IN"                               |
| scheduleNote         | String?   |                          | Patient instructions note                         |
| externalOrderId      | String?   |                          | Partner API order ID                              |
| dispatchStatus       | String    | default PENDING          | "PENDING" \| "DISPATCHED" \| "FAILED"             |
| dispatchError        | String?   |                          | Last dispatch error (max 500 chars)               |
| dispatchedAt         | DateTime? |                          |                                                   |
| createdAt            | DateTime  | default now              |                                                   |
| updatedAt            | DateTime  | @updatedAt               |                                                   |

**LabOrder.status valid values:**
`PENDING` → `AWAITING_PAYMENT` → `CONFIRMED` → `SAMPLE_COLLECTED` → `IN_TRANSIT` → `REPORTS_READY`
Also: `CANCELLED`

Indexes: `(status, createdAt)`, `(labPartnerId, status)`, `(patientId, status)`

---

## 26. LabOrderEvent

Immutable log of LabOrder status transitions.

| Field                | Type      | Constraints     | Notes                          |
|----------------------|-----------|-----------------|--------------------------------|
| id                   | String    | PK, cuid        |                                |
| labOrderId           | String    | FK→LabOrder (cascade), IDX+at |                      |
| fromStatus           | String?   |                 | Null on first event            |
| toStatus             | String    |                 |                                |
| note                 | String?   |                 |                                |
| collectionAgentName  | String?   |                 |                                |
| collectionAgentPhone | String?   |                 |                                |
| actorEmail           | String?   |                 | Actor identifier (email)       |
| createdAt            | DateTime  | default now     |                                |

---

## 27. LabPartner

Accredited lab partner entity.

| Field          | Type      | Constraints    | Notes                                             |
|----------------|-----------|----------------|---------------------------------------------------|
| id             | String    | PK, cuid       |                                                   |
| name           | String    |                |                                                   |
| contactName    | String    |                |                                                   |
| email          | String    | UQ             |                                                   |
| phone          | String    |                | Used for WhatsApp notifications                   |
| addressLine1   | String    |                |                                                   |
| addressLine2   | String?   |                |                                                   |
| city           | String    |                |                                                   |
| state          | String    |                |                                                   |
| pincode        | String    |                |                                                   |
| nablCertified  | Boolean   | default false  | NABL accreditation status                         |
| nablCertNumber | String?   |                | NABL certificate number                           |
| testCategories | String[]  |                | e.g. ["HAEMATOLOGY","BIOCHEMISTRY"]               |
| serviceAreas   | String[]  | default []     | Postal codes served for home collection           |
| homeCollection | Boolean   | default true   | Offers home sample collection                     |
| isActive       | Boolean   | default true   | IDX                                               |
| notes          | String?   |                | Internal notes                                    |
| apiType        | String?   |                | "THYROCARE" \| "LYBRATE" \| "MANUAL" or null      |
| apiBaseUrl     | String?   |                | Partner API base URL                              |
| apiKeyEnvVar   | String?   |                | Env var name holding API key (not the key itself) |
| apiSecretEnvVar| String?   |                | Env var name holding API secret                   |
| webhookSecret  | String?   |                | HMAC secret for webhook verification              |
| createdAt      | DateTime  | default now    |                                                   |
| updatedAt      | DateTime  | @updatedAt     |                                                   |

---

## 28. LabUser

Portal user for a lab partner.

| Field       | Type      | Constraints          | Notes                  |
|-------------|-----------|----------------------|------------------------|
| id          | String    | PK, cuid             |                        |
| email       | String    | UQ                   |                        |
| passwordHash| String    |                      | bcrypt                 |
| role        | String    | default LAB_ADMIN    | "LAB_ADMIN" \| "TECH"  |
| labPartnerId| String?   | FK→LabPartner, IDX   |                        |
| createdAt   | DateTime  | default now          |                        |

---

## 29. PharmacyPartner

Licensed pharmacy partner entity.

| Field            | Type      | Constraints    | Notes                                              |
|------------------|-----------|----------------|----------------------------------------------------|
| id               | String    | PK, cuid       |                                                    |
| name             | String    |                |                                                    |
| contactName      | String    |                |                                                    |
| email            | String    | UQ             |                                                    |
| phone            | String    |                | Used for WhatsApp notifications                    |
| addressLine1     | String    |                |                                                    |
| addressLine2     | String?   |                |                                                    |
| city             | String    |                |                                                    |
| state            | String    |                |                                                    |
| pincode          | String    |                |                                                    |
| drugLicenseNumber| String    |                | Displayed to patients (regulatory disclosure)      |
| gstNumber        | String?   |                | GST registration                                   |
| serviceAreas     | String[]  |                | Postal codes served; used for auto-assignment      |
| isActive         | Boolean   | default true   | IDX                                                |
| notes            | String?   |                |                                                    |
| apiType          | String?   |                | "PHARMEASY" \| "1MG" \| "MANUAL" or null          |
| apiBaseUrl       | String?   |                |                                                    |
| apiKeyEnvVar     | String?   |                | Env var name holding API key                       |
| apiSecretEnvVar  | String?   |                | Env var name holding API secret                    |
| webhookSecret    | String?   |                | HMAC secret for webhook verification               |
| createdAt        | DateTime  | default now    |                                                    |
| updatedAt        | DateTime  | @updatedAt     |                                                    |

---

## 30. PharmacyUser

Portal user for a pharmacy partner.

| Field             | Type      | Constraints               | Notes                          |
|-------------------|-----------|---------------------------|--------------------------------|
| id                | String    | PK, cuid                  |                                |
| email             | String    | UQ                        |                                |
| passwordHash      | String    |                           | bcrypt                         |
| role              | String    | default PHARMACY          | "PHARMACY" \| "PHARMACY_ADMIN" |
| pharmacyPartnerId | String?   | FK→PharmacyPartner, IDX   |                                |
| createdAt         | DateTime  | default now               |                                |

---

## 31. RxOrder

Medicine/prescription delivery order.

| Field               | Type      | Constraints              | Notes                                              |
|---------------------|-----------|--------------------------|--------------------------------------------------- |
| id                  | String    | PK, cuid                 |                                                    |
| patientId           | String?   | FK→Patient (SetNull), IDX |                                                   |
| patientName         | String    |                          | Denormalized; required for dispatch                |
| patientPhone        | String    |                          | Denormalized                                       |
| patientEmail        | String?   |                          |                                                    |
| address             | Json      |                          | `{line1, line2?, city, state, postalCode}`         |
| items               | Json      |                          | Array of `{name, qty}` (prescription medicines)    |
| notes               | String?   |                          |                                                    |
| rxDocumentKey       | String?   |                          | S3 key for uploaded prescription document          |
| rxDocumentName      | String?   |                          |                                                    |
| rxDocumentType      | String?   |                          | MIME type                                          |
| rxDocumentSize      | Int?      |                          | File size in bytes                                 |
| rxDocumentUploadedAt| DateTime? |                          |                                                    |
| amountPaise         | Int       |                          | Final payment amount; 0 until quote confirmed      |
| quotedAmountPaise   | Int?      |                          | Pharmacy's quoted amount (before patient confirms) |
| quoteNote           | String?   |                          | Pharmacy notes on quote                            |
| quoteExpiresAt      | DateTime? |                          | Quote validity                                     |
| status              | String    | default AWAITING_PAYMENT, IDX | enum-str (see below)                          |
| trackingNumber      | String?   |                          | Courier tracking number                            |
| courierName         | String?   |                          |                                                    |
| pharmacyPartnerId   | String?   | FK→PharmacyPartner (SetNull), IDX |                                             |
| appointmentId       | String?   | FK→Appointment (SetNull), IDX |                                                |
| externalOrderId     | String?   |                          | Partner API order ID                               |
| dispatchStatus      | String    | default PENDING          | "PENDING" \| "DISPATCHED" \| "FAILED"              |
| dispatchError       | String?   |                          | Last dispatch error (max 500 chars)                |
| dispatchedAt        | DateTime? |                          |                                                    |
| createdAt           | DateTime  | default now              |                                                    |
| updatedAt           | DateTime  | @updatedAt               |                                                    |

**RxOrder.status valid values:**
- Appointment-linked path: `QUOTE_PENDING` → `QUOTE_READY` → `AWAITING_PAYMENT` → `PAID` → `PROCESSING` → `DISPATCHED` → `DELIVERED`
- Standalone path: `AWAITING_PAYMENT` → `PAID` → `PROCESSING` → `DISPATCHED` → `DELIVERED`
- Terminal: `REJECTED`, `CANCELLED`, `DELIVERY_FAILED`

Indexes: `(patientId)`, `(pharmacyPartnerId)`, `(appointmentId)`, `(status, createdAt)`

---

## 32. RxOrderItem

Per-medicine line item for a pharmacy quote-review cycle.

| Field             | Type      | Constraints     | Notes                                        |
|-------------------|-----------|-----------------|----------------------------------------------|
| id                | String    | PK, cuid        |                                              |
| rxOrderId         | String    | FK→RxOrder (cascade), IDX |                                    |
| name              | String    |                 | Medicine name from prescription              |
| sig               | String?   |                 | Dosage instructions from prescription        |
| qtyPrescribed     | String?   |                 | Prescribed quantity                          |
| status            | String    | default PENDING | enum-str: PENDING \| AVAILABLE \| SUBSTITUTED \| UNAVAILABLE \| REJECTED_BY_PATIENT |
| dispensedName     | String?   |                 | Substitute brand name if SUBSTITUTED         |
| dispensedSig      | String?   |                 | Substitute dosage                            |
| unitPricePaise    | Int?      |                 | Pharmacy quoted price per unit               |
| qtyDispensed      | Int?      |                 | Qty pharmacy will dispense                   |
| substituteApproved| Boolean?  |                 | Patient accepted substitute                  |
| note              | String?   |                 | Pharmacy note on this item                   |
| createdAt         | DateTime  | default now     |                                              |
| updatedAt         | DateTime  | @updatedAt      |                                              |

---

## 33. RxOrderEvent

Immutable log of RxOrder status transitions.

| Field         | Type      | Constraints     | Notes                          |
|---------------|-----------|-----------------|--------------------------------|
| id            | String    | PK, cuid        |                                |
| rxOrderId     | String    | FK→RxOrder (cascade), IDX+at |                      |
| fromStatus    | String?   |                 | Null on first event            |
| toStatus      | String    |                 |                                |
| note          | String?   |                 |                                |
| trackingNumber| String?   |                 |                                |
| courierName   | String?   |                 |                                |
| actorEmail    | String?   |                 |                                |
| createdAt     | DateTime  | default now     |                                |

---

## 34. FollowUpRequest

Doctor-requested follow-up reminder for a patient.

| Field        | Type      | Constraints               | Notes                                          |
|--------------|-----------|---------------------------|------------------------------------------------|
| id           | String    | PK, cuid                  |                                                |
| appointmentId| String    | FK→Appointment (cascade), IDX |                                            |
| patientId    | String    | FK→Patient (cascade), IDX composite |                                      |
| providerId   | String    | FK→Provider (cascade)     |                                                |
| labOrderId   | String?   | FK→LabOrder (SetNull)     | Linked lab order for AFTER_LAB_RESULTS type    |
| type         | String    |                           | enum-str: "TIMED" \| "AFTER_LAB_RESULTS"       |
| daysUntilDue | Int?      |                           | For TIMED type: days from appointment          |
| status       | String    | default PENDING, IDX      | enum-str: PENDING \| NOTIFIED \| BOOKED \| DISMISSED \| EXPIRED |
| dueAt        | DateTime? |                           | Computed due date                              |
| providerNote | String?   |                           | Doctor's note to patient (max 300 chars)       |
| notifiedAt   | DateTime? |                           | When WhatsApp was sent                         |
| createdAt    | DateTime  | default now               |                                                |
| updatedAt    | DateTime  | @updatedAt                |                                                |

Indexes: `(patientId, status)`, `(status, dueAt)`, `(appointmentId)`

---

## 35. OfflineRequest

Requests from patients without internet access (submitted via phone/agent).

| Field      | Type      | Constraints              | Notes                                          |
|------------|-----------|--------------------------|------------------------------------------------|
| id         | String    | PK, cuid                 |                                                |
| name       | String    |                          |                                                |
| phone      | String    |                          |                                                |
| speciality | String?   |                          |                                                |
| notes      | String?   |                          |                                                |
| status     | String    | default RECEIVED, IDX    | enum-str: RECEIVED \| IN_PROGRESS \| RESOLVED  |
| createdAt  | DateTime  | Timestamptz, IDX         |                                                |
| resolvedAt | DateTime? | Timestamptz              |                                                |

---

## 36. Medication

Searchable medication catalog used for prescription autocomplete and Rx ordering.

| Field    | Type      | Constraints  | Notes                                        |
|----------|-----------|--------------|----------------------------------------------|
| id       | String    | PK, cuid     |                                              |
| name     | String    | UQ           | B-tree index created by unique constraint    |
| generic  | String?   |              | Generic name                                 |
| form     | String?   |              | "Tablet" \| "Capsule" \| "Syrup" etc.        |
| strength | String?   |              | e.g. "500mg"                                 |
| category | String?   | default OTC  | "OTC" \| "PRESCRIPTION" \| "SCHEDULE_H" \| "SCHEDULE_X" |
| createdAt| DateTime? | default now  |                                              |

---

## 37. ProviderEnrollment

Self-enrollment application for a new provider.

| Field               | Type      | Constraints    | Notes                                        |
|---------------------|-----------|----------------|----------------------------------------------|
| id                  | String    | PK, cuid       |                                              |
| fullName            | String    |                |                                              |
| email               | String    | IDX            |                                              |
| phone               | String    |                |                                              |
| dob                 | DateTime? |                |                                              |
| gender              | String?   |                |                                              |
| qualification       | String    |                |                                              |
| university          | String?   |                |                                              |
| qualificationYear   | Int?      |                |                                              |
| registrationNumber  | String    |                |                                              |
| registrationCouncil | String    |                |                                              |
| registrationYear    | Int?      |                |                                              |
| speciality          | String    |                |                                              |
| subSpeciality       | String?   |                |                                              |
| experienceYears     | Int?      |                |                                              |
| currentHospital     | String?   |                |                                              |
| city                | String    |                |                                              |
| state               | String    |                |                                              |
| languages           | String[]  |                | ISO 2-letter codes                           |
| visitModes          | String[]  |                | ["VIDEO","IN_PERSON","AUDIO"]                |
| feePaise            | Int?      |                | Requested consultation fee                   |
| bio                 | String?   |                |                                              |
| consentTelemedicine | Boolean   | default false  | Confirms telemedicine practice guidelines    |
| profilePhotoKey     | String?   |                | S3 key                                       |
| qualificationDocKey | String?   |                | S3 key                                       |
| registrationDocKey  | String?   |                | S3 key                                       |
| status              | String    | default PENDING, IDX | enum-str: PENDING \| APPROVED \| REJECTED |
| createdAt           | DateTime  | default now, IDX |                                            |
| reviewedAt          | DateTime? |                |                                              |
| reviewedByEmail     | String?   |                | AdminUser.email of reviewer                  |
| rejectionReason     | String?   |                |                                              |
| providerId          | String?   |                | ID of created Provider (set on approval)     |
| adminNotifiedAt     | DateTime? |                |                                              |

---

## 38. PharmacyEnrollment

Self-enrollment application for a pharmacy partner.

Key fields same as PharmacyPartner plus:

| Field             | Type      | Constraints    | Notes                                     |
|-------------------|-----------|----------------|-------------------------------------------|
| status            | String    | default PENDING| enum-str: PENDING \| APPROVED \| REJECTED |
| reviewedAt        | DateTime? |                |                                           |
| reviewedByEmail   | String?   |                |                                           |
| rejectionReason   | String?   |                |                                           |
| pharmacyPartnerId | String?   |                | ID of created PharmacyPartner (approval)  |
| adminNotifiedAt   | DateTime? |                |                                           |

---

## 39. LabEnrollment

Self-enrollment application for a lab partner. Structure mirrors PharmacyEnrollment.

| Field         | Type      | Constraints    | Notes                                     |
|---------------|-----------|----------------|-------------------------------------------|
| labPartnerId  | String?   |                | ID of created LabPartner (on approval)    |
| status        | String    | default PENDING| enum-str: PENDING \| APPROVED \| REJECTED |

---

## 40. PatientPasswordReset

Secure tokens for patient password recovery.

| Field     | Type      | Constraints              | Notes                          |
|-----------|-----------|--------------------------|--------------------------------|
| id        | String    | PK, cuid                 |                                |
| patientId | String    | FK→Patient, IDX          |                                |
| token     | String    | UQ                       | Cryptographically random token |
| expiresAt | DateTime  | IDX                      | Typically 1 hour from creation |
| usedAt    | DateTime? |                          | Null until token is consumed   |

---

## 41. RefundRequest (NEW)

Tracks refund requests with gateway refund IDs for auditability.

| Field           | Type      | Constraints           | Notes                                              |
|-----------------|-----------|-----------------------|----------------------------------------------------|
| id              | String    | PK, cuid              |                                                    |
| paymentId       | String    | FK→Payment, IDX       |                                                    |
| amount          | Int       |                       | Refund amount in paise (may be partial)            |
| reason          | String    |                       | Reason for refund                                  |
| requestedBy     | String    |                       | actorId from relevant user table                   |
| requestedByType | String    |                       | "PATIENT" \| "ADMIN" \| "PROVIDER"                 |
| status          | String    | default PENDING, IDX  | enum-str: PENDING \| APPROVED \| PROCESSED \| REJECTED |
| gatewayRefundId | String?   |                       | Razorpay refund ID                                 |
| processedAt     | DateTime? |                       | When refund was confirmed by gateway               |
| notes           | String?   |                       |                                                    |
| createdAt       | DateTime  | default now           |                                                    |
| updatedAt       | DateTime  | @updatedAt            |                                                    |

Indexes: `(paymentId)`, `(status, createdAt)`

---

## 42. ProviderScheduleTemplate (NEW)

Recurring availability windows that the generate-slots cron uses to create Slot records.

| Field               | Type      | Constraints              | Notes                                           |
|---------------------|-----------|--------------------------|-------------------------------------------------|
| id                  | String    | PK, cuid                 |                                                 |
| providerId          | String    | FK→Provider (cascade), IDX composite |                                     |
| dayOfWeek           | Int       |                          | 0=Sunday, 1=Monday … 6=Saturday                 |
| startHour           | Int       |                          | 0–23 in IST                                     |
| startMinute         | Int       | default 0                | 0, 15, 30, or 45                                |
| endHour             | Int       |                          | 0–23 in IST                                     |
| endMinute           | Int       | default 0                |                                                 |
| slotDurationMinutes | Int       | default 30               | Duration of each generated slot                 |
| isActive            | Boolean   | default true             |                                                 |
| effectiveFrom       | DateTime? |                          | Null = active immediately                       |
| effectiveTo         | DateTime? |                          | Null = active indefinitely                       |
| createdAt           | DateTime  | default now              |                                                 |
| updatedAt           | DateTime  | @updatedAt               |                                                 |

Indexes: `(providerId, dayOfWeek)`, `(providerId, isActive)`

---

## Appendix A — Status Enum Reference

| Model          | Field          | Valid Values                                              |
|----------------|----------------|-----------------------------------------------------------|
| Appointment    | status         | PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW |
| Appointment    | visitMode      | VIDEO, IN_PERSON, AUDIO                                   |
| Payment        | status         | PENDING, CAPTURED, FAILED, REFUNDED                       |
| LabOrder       | status         | PENDING, AWAITING_PAYMENT, CONFIRMED, SAMPLE_COLLECTED, IN_TRANSIT, REPORTS_READY, CANCELLED |
| LabOrder       | source         | APPOINTMENT, AT_HOME                                      |
| LabOrder       | collectionType | HOME, WALK_IN                                             |
| LabOrder       | dispatchStatus | PENDING, DISPATCHED, FAILED                               |
| RxOrder        | status         | QUOTE_PENDING, QUOTE_READY, AWAITING_PAYMENT, PAID, PROCESSING, DISPATCHED, DELIVERED, REJECTED, CANCELLED, DELIVERY_FAILED |
| RxOrder        | dispatchStatus | PENDING, DISPATCHED, FAILED                               |
| RxOrderItem    | status         | PENDING, AVAILABLE, SUBSTITUTED, UNAVAILABLE, REJECTED_BY_PATIENT |
| NgoReservation | status         | HELD, CONFIRMED, RELEASED, EXPIRED, CANCELLED             |
| FollowUpRequest| type           | TIMED, AFTER_LAB_RESULTS                                  |
| FollowUpRequest| status         | PENDING, NOTIFIED, BOOKED, DISMISSED, EXPIRED             |
| OfflineRequest | status         | RECEIVED, IN_PROGRESS, RESOLVED                           |
| PharmacyFulfillment | status    | READY, PACKED, SHIPPED, DELIVERED, SENT                   |
| RefundRequest  | status         | PENDING, APPROVED, PROCESSED, REJECTED                    |
| ProviderEnrollment | status     | PENDING, APPROVED, REJECTED                               |
| PharmacyEnrollment | status     | PENDING, APPROVED, REJECTED                               |
| LabEnrollment  | status         | PENDING, APPROVED, REJECTED                               |
| AdminUser      | role           | SUPER_ADMIN, SUPPORT, FINANCE                             |
| OutboundMessage| channel        | WHATSAPP, SMS, EMAIL                                      |
| AuditLog       | actorType      | PATIENT, PROVIDER, ADMIN, PHARMACY, LAB, FRONTDESK, NGO, SYSTEM |

# CalDoc Test Cases (v1 Draft)

## 1) Patient Authentication
### TC-AUTH-001 Request OTP
- Given valid phone
- When POST /api/patient/login/request-otp
- Then OTP request accepted and response success

### TC-AUTH-002 Verify OTP success
- Given valid OTP
- When POST /api/patient/login/verify-otp
- Then session cookie is set and /api/patient/me returns patient profile

### TC-AUTH-003 Verify OTP failure
- Given invalid/expired OTP
- Then API returns error with safe message

## 2) Provider Discovery
### TC-PROV-001 Search by specialty
- Given specialty filter
- When opening /providers?specialty=...
- Then list returns matching providers only

### TC-PROV-002 Pagination/perf guard
- Given no filters
- When opening /providers
- Then only up to configured page size rendered and response remains within target

## 3) Booking Flow
### TC-BOOK-001 Book with available slot
- Given open slot
- When POST /api/appointments/create
- Then appointment created in pending state and slot reserved/booked

### TC-BOOK-002 Slot conflict
- Given slot already booked
- Then booking API rejects with deterministic conflict response

## 4) Checkout/Payment
### TC-PAY-001 Create order
- Given valid appointment/amount
- When POST /api/checkout/create-order
- Then Razorpay order id is returned

### TC-PAY-002 Confirm payment idempotency
- Given same payment callback retried
- When POST /api/checkout/confirm multiple times
- Then system records single final paid state and duplicate call is safe

### TC-PAY-003 Payment failure path
- Given failed gateway response
- Then order remains unpaid and user sees retry path

## 5) Provider Portal
### TC-PORT-001 Provider login
- Given valid provider credentials
- Then /provider/appointments loads with authorized data

### TC-PORT-002 Update appointment status
- When provider marks completed/cancelled/no-show
- Then status transitions are validated and auditable

### TC-PORT-003 Create prescription
- Given completed consult
- Then prescription save + PDF endpoint responds correctly

## 6) Labs / Pharmacy
### TC-LAB-001 Lab order create and confirm
- Validate create-order + confirm endpoints and payment state transition

### TC-RX-001 RX delivery order create and confirm
- Validate create-order + confirm endpoints and final order data integrity

## 7) Admin / NGO
### TC-ADMIN-001 Admin login and provider status toggle
- Ensure auth, role checks, and state update are enforced

### TC-NGO-001 Bulk reservations
- Validate reservation creation and release/update behavior

## 8) Security / Reliability
### TC-SEC-001 Unauthorized access checks
- All role-protected routes reject unauthorized requests

### TC-REL-001 API error handling consistency
- Forced failures return structured error payloads

### TC-PERF-001 Hot route latency checks
- Measure /, /providers, /book/[id], /services/rx-delivery
- Track cold/warm timings and compare sprint-over-sprint

## 9) Regression Smoke Pack (per release)
- Patient login, booking, checkout
- Provider login, status update, prescription
- Labs/RX order core flow
- Admin login + provider status

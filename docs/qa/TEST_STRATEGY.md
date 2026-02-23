# CalDoc Test Strategy (Launch)

## Scope
End-to-end quality coverage for:
- Patient journey (search → book → pay → consult → follow-up)
- Provider journey (login → schedule → consult → notes/prescription)
- Admin/NGO operations
- Labs and pharmacy order flows
- Reliability, performance, and security-critical behavior

## Test Layers
1. **Smoke tests** (critical path)
2. **Functional API tests** (auth, booking, payment, status transitions)
3. **UI integration tests** (key pages/forms)
4. **Non-functional tests** (latency, caching, error handling)

## Release Gates (P0)
- No critical broken flows
- Payment confirmation idempotency validated
- Auth/session checks pass for all roles
- P95 route latency targets met on key routes
- No blocker-severity issues open

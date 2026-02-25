# WhatsApp Auto-Booking Bot Plan (CalDoc)

## Objective
Enable any user to message CalDoc on WhatsApp and complete appointment booking automatically via chat.

## Current State (from code review)
- ✅ Outbound WhatsApp sending exists (`src/lib/whatsapp.ts`).
- ✅ Meta webhook endpoint exists (`/api/meta/webhook`) but currently processes delivery statuses only.
- ✅ Booking, payment, provider lookup, slot creation APIs already exist in web app.
- ❌ No inbound conversation engine for user chat messages.
- ❌ No WhatsApp session state machine for booking flow.

## Target User Journey (WhatsApp)
1. User says: "Need dermatologist tomorrow"
2. Bot asks required fields (name, phone confirm, specialty, date/time preference)
3. Bot shows top provider options
4. User picks provider
5. Bot shows slot options
6. User picks slot
7. Bot creates appointment (PENDING)
8. Bot sends payment link (or UPI flow)
9. On payment confirmation webhook, bot sends booking confirmation + consult link

## Architecture

### 1) Inbound webhook handling
Enhance `/api/meta/webhook` POST to also parse inbound messages:
- text
- interactive replies (buttons/list)
- media/doc uploads (future)

### 2) Conversation state layer
Add a booking chat state store, e.g. `WhatsAppConversation`:
- `id`
- `phone`
- `state` (START, SPECIALTY, PROVIDER_PICK, SLOT_PICK, PAYMENT_PENDING, CONFIRMED)
- `contextJson` (specialty/date/providerId/slotId/appointmentId)
- `updatedAt`, `expiresAt`

### 3) Orchestration service
Create `src/lib/whatsappBookingFlow.ts`:
- `handleIncomingMessage(phone, message)`
- `advanceState(...)`
- `sendPrompt(...)`
- calls existing DB and APIs for providers/slots/appointment creation

### 4) Message templates + interactive UX
Use WhatsApp approved templates/buttons:
- Quick replies for specialty selection
- Button/list for provider and slot selection
- Fallback text parser if user types freeform

### 5) Payment handoff
After appointment creation:
- trigger existing `/api/checkout/create-order`
- send payment CTA via WhatsApp template/button URL
- confirmation via existing `/api/checkout/confirm` webhook path

## Required Data/Schema Additions
1. `WhatsAppConversation` table (state + context)
2. Optional `WhatsAppInboundMessage` table (audit/debug)
3. Optional `OutboundMessage` enhancement (correlation IDs per flow)

## API/Code Tasks

### Phase A (MVP)
1. Extend `/api/meta/webhook` to process inbound text and route to booking handler.
2. Add conversation state table + Prisma migration.
3. Build state machine for:
   - specialty capture
   - provider list
   - slot list
   - appointment creation
4. Send confirmation/failure responses via WhatsApp text.

### Phase B (Production)
1. Add interactive button/list messages.
2. Add language support (`en`, `hi`, `te`) using locale in session context.
3. Add abuse protection (rate limit by phone, cooldown, invalid attempts).
4. Add retries/backoff for Meta API sends.
5. Add dead-letter handling for failed inbound processing.

### Phase C (Scale & Ops)
1. Agent handoff mode: escalate to human operator when confidence is low.
2. Admin dashboard view for active conversations and stuck states.
3. Metrics + alerting dashboards.

## Guardrails / Compliance
- Never expose PHI in logs.
- Keep consent and notification records.
- Session expiry (e.g., 30 minutes idle) + safe restart message.
- Validate phone ownership assumptions carefully.

## Metrics (Success Criteria)
- WhatsApp inquiry → booking conversion rate
- Time-to-book (median)
- Drop-off by state (specialty/provider/slot/payment)
- Payment completion rate from WhatsApp flow
- Bot failure/escalation rate

## Suggested Rollout
1. Internal sandbox numbers only
2. Limited beta (one specialty + one city)
3. Full rollout with fallback to human handoff

## Timeline (practical)
- MVP text flow: 3-5 days
- Production interactive + hardening: 5-8 days
- Monitoring/dashboard + handoff: 3-5 days

Total: ~2-3 weeks for robust launch-grade implementation.

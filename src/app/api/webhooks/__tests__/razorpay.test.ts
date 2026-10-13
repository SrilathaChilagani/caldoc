import crypto from "crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => {
  const prisma = {
    payment: { findUnique: vi.fn(), update: vi.fn() },
    appointment: { findUnique: vi.fn(), update: vi.fn() },
    slot: { update: vi.fn() },
    rxOrder: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    labOrder: { updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    labPartner: { findUnique: vi.fn() },
    outboundMessage: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  };
  return { prisma };
});
vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn(), captureException: vi.fn() }));
vi.mock("@/lib/sendProviderBookingNotification", () => ({
  notifyProviderOfBooking: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/sendPatientAudioConfirmation", () => ({
  sendPatientAudioConfirmation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/videoLinkHelpers", () => ({
  ensureVideoRoomIfNeeded: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/sendCheckinFormLink", () => ({
  sendCheckinFormLink: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppText: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/sendLabOrderConfirmation", () => ({
  notifyLabOrderConfirmation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/pharmacy", () => ({ dispatchRxOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/lab", () => ({ dispatchLabOrder: vi.fn().mockResolvedValue(undefined) }));

import { POST } from "../razorpay/route";
import { prisma } from "@/lib/db";

// ── Helpers ──────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = "test-webhook-secret";
const ORDER_ID = "order_wh1";
const PAYMENT_ID = "pay_wh1";

function makeWebhookReq(event: object, secret = WEBHOOK_SECRET) {
  const body = JSON.stringify(event);
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return new NextRequest("http://localhost/api/webhooks/razorpay", {
    method: "POST",
    headers: { "x-razorpay-signature": sig },
    body,
  });
}

const CAPTURE_EVENT = {
  event: "payment.captured",
  payload: { payment: { entity: { order_id: ORDER_ID, id: PAYMENT_ID } } },
};

const PENDING_PAYMENT = {
  id: "pmnt_1",
  status: "PENDING",
  appointmentId: "appt_1",
  rxOrderId: null,
  labOrderId: null,
};

const CONFIRMED_APPOINTMENT = {
  id: "appt_1",
  status: "PENDING",
  providerId: "prov_1",
  slotId: "slot_1",
  visitMode: "VIDEO",
  videoRoom: null,
  patientName: "Priya",
  patient: { name: "Priya S", phone: "+919876543210" },
  provider: { name: "Dr. Reddy", phone: "+919123456789" },
  slot: { startsAt: new Date("2026-12-01T10:00:00Z") },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/razorpay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RZP_WEBHOOK_SECRET = WEBHOOK_SECRET;
  });

  afterEach(() => {
    delete process.env.RZP_WEBHOOK_SECRET;
  });

  // ── Auth / signature ──────────────────────────────────────────────────────

  it("returns 500 when RZP_WEBHOOK_SECRET is not configured", async () => {
    delete process.env.RZP_WEBHOOK_SECRET;
    const res = await POST(makeWebhookReq(CAPTURE_EVENT, WEBHOOK_SECRET));
    expect(res.status).toBe(500);
  });

  it("returns 400 when webhook signature is wrong", async () => {
    const res = await POST(makeWebhookReq(CAPTURE_EVENT, "wrong-secret"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/signature/i);
  });

  it("returns 400 when body is not valid JSON", async () => {
    const body = "not-json";
    const sig = crypto.createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    const req = new NextRequest("http://localhost/api/webhooks/razorpay", {
      method: "POST",
      headers: { "x-razorpay-signature": sig },
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── Event filtering ───────────────────────────────────────────────────────

  it("ignores non-payment.captured events", async () => {
    const res = await POST(makeWebhookReq({ event: "payment.failed", payload: {} }));
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe(true);
    expect(prisma.payment.findUnique).not.toHaveBeenCalled();
  });

  it("returns 400 when payment entity is missing order_id", async () => {
    const event = { event: "payment.captured", payload: { payment: { entity: { id: PAYMENT_ID } } } };
    const res = await POST(makeWebhookReq(event));
    expect(res.status).toBe(400);
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it("returns 200 without re-processing when payment is already CAPTURED", async () => {
    (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...PENDING_PAYMENT,
      status: "CAPTURED",
    });
    const res = await POST(makeWebhookReq(CAPTURE_EVENT));
    expect(res.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ── Appointment payment path ──────────────────────────────────────────────

  it("captures payment and confirms a PENDING appointment", async () => {
    (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(PENDING_PAYMENT);
    (prisma.appointment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(CONFIRMED_APPOINTMENT);
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: Function) => fn(prisma),
    );
    (prisma.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.slot.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.appointment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const res = await POST(makeWebhookReq(CAPTURE_EVENT));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CAPTURED" }) }),
    );
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONFIRMED" }) }),
    );
  });

  // ── Rx order payment path ─────────────────────────────────────────────────

  it("updates Rx order to PAID on payment.captured", async () => {
    (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pmnt_2",
      status: "PENDING",
      rxOrderId: "rx_1",
      labOrderId: null,
      appointmentId: null,
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([{}, {}]);
    (prisma.rxOrder.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "rx_1",
      patientPhone: "+919876543210",
      patientName: "Priya",
    });

    const res = await POST(makeWebhookReq(CAPTURE_EVENT));

    expect(res.status).toBe(200);
    expect(prisma.rxOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PAID" } }),
    );
  });

  // ── Lab order payment path ────────────────────────────────────────────────

  it("updates Lab order to PENDING on payment.captured", async () => {
    (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pmnt_3",
      status: "PENDING",
      rxOrderId: null,
      labOrderId: "lab_1",
      appointmentId: null,
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([{}, {}]);
    (prisma.labOrder.findUniqueOrThrow as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "lab_1",
      patientPhone: "+919876543210",
      patientName: "Priya",
      patientAddress: null,
      labPartnerId: null,
      tests: [],
      address: null,
    });

    const res = await POST(makeWebhookReq(CAPTURE_EVENT));

    expect(res.status).toBe(200);
    expect(prisma.labOrder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PENDING" } }),
    );
  });
});

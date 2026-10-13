import crypto from "crypto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => {
  const prisma = {
    payment: { findUnique: vi.fn(), update: vi.fn() },
    appointment: { findUnique: vi.fn(), update: vi.fn() },
    slot: { update: vi.fn() },
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

import { POST } from "../confirm/route";
import { prisma } from "@/lib/db";

// ── Helpers ──────────────────────────────────────────────────────────────────

const RZP_SECRET = "test-rzp-secret";
const ORDER_ID = "order_test1";
const PAYMENT_ID = "pay_test1";

function makeHmac(orderId: string, paymentId: string, secret = RZP_SECRET) {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

function makeReq(body: object) {
  return new NextRequest("http://localhost/api/checkout/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody(overrides: object = {}) {
  return {
    appointmentId: "appt_1",
    razorpay_order_id: ORDER_ID,
    razorpay_payment_id: PAYMENT_ID,
    razorpay_signature: makeHmac(ORDER_ID, PAYMENT_ID),
    ...overrides,
  };
}

const PENDING_APPOINTMENT = {
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

function setupHappyPathMocks() {
  (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (prisma.appointment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(PENDING_APPOINTMENT);
  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: Function) => fn(prisma),
  );
  (prisma.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (prisma.slot.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (prisma.appointment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/checkout/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RZP_SECRET = RZP_SECRET;
  });

  afterEach(() => {
    delete process.env.RZP_SECRET;
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it("returns 400 when appointmentId is missing", async () => {
    const { appointmentId: _omit, ...body } = validBody() as any;
    const res = await POST(makeReq(body));
    expect(res.status).toBe(400);
    // Zod 4 emits "Invalid input: expected string, received undefined" for missing fields
    expect((await res.json()).error).toBeTruthy();
  });

  it("returns 400 when razorpay_signature is not 64-char hex", async () => {
    const res = await POST(makeReq(validBody({ razorpay_signature: "tooshort" })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/razorpay_signature/i);
  });

  it("returns 500 when body is not valid JSON", async () => {
    const req = new NextRequest("http://localhost/api/checkout/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    // req.json() throws SyntaxError → caught by outer handler → 500
    expect(res.status).toBe(500);
  });

  // ── Signature verification ────────────────────────────────────────────────

  it("returns 500 when RZP_SECRET is not configured", async () => {
    delete process.env.RZP_SECRET;
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/RZP_SECRET/i);
  });

  it("returns 400 when HMAC signature does not match", async () => {
    const res = await POST(makeReq(validBody({
      razorpay_signature: makeHmac(ORDER_ID, PAYMENT_ID, "wrong-secret"),
    })));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/signature/i);
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  it("returns 200 without DB writes when payment is already CAPTURED", async () => {
    (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "CAPTURED" });
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ── Business logic ────────────────────────────────────────────────────────

  it("returns 404 when appointment is not found", async () => {
    (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.appointment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(makeReq(validBody()));
    expect(res.status).toBe(404);
  });

  it("captures payment and confirms a PENDING appointment", async () => {
    setupHappyPathMocks();
    const res = await POST(makeReq(validBody()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CAPTURED", paymentRef: PAYMENT_ID }),
      }),
    );
    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CONFIRMED" }),
      }),
    );
  });

  it("preserves CANCELLED status when a late payment arrives", async () => {
    (prisma.payment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.appointment.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...PENDING_APPOINTMENT,
      status: "CANCELLED",
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: Function) => fn(prisma),
    );
    (prisma.payment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.slot.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.appointment.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await POST(makeReq(validBody()));

    expect(prisma.appointment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
  });
});

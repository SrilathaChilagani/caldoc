import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => {
  const prisma = {
    patient: { findUnique: vi.fn(), create: vi.fn() },
    slot: { findUnique: vi.fn(), updateMany: vi.fn() },
    appointment: { create: vi.fn() },
    outboundMessage: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(),
  };
  return { prisma };
});
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, retryAfterSec: 0 }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
}));
vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppTemplate: vi.fn().mockResolvedValue({ messageId: "msg_1" }),
  sendWhatsAppText: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/exotel", () => ({ sendSms: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/checkinToken", () => ({ createCheckinToken: vi.fn().mockReturnValue("tok_test") }));

import { POST } from "../create/route";
import { prisma } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: object) {
  return new Request("http://localhost/api/appointments/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  providerId: "prov_1",
  slotId: "slot_1",
  name: "Priya Sharma",
  phone: "+919876543210",
  consentText: "I consent to teleconsultation",
  visitMode: "VIDEO",
};

function makeTx(opts: { slotLockCount?: number } = {}) {
  return {
    patient: {
      findUnique: vi.fn().mockResolvedValue({ id: "pat_1", name: "Priya Sharma", phone: "+919876543210" }),
      create: vi.fn(),
    },
    slot: {
      findUnique: vi.fn().mockResolvedValue({
        providerId: "prov_1",
        startsAt: new Date(Date.now() + 86_400_000), // tomorrow
        feePaise: 50_000,
        isBooked: false,
        provider: { defaultFeePaise: null },
      }),
      updateMany: vi.fn().mockResolvedValue({ count: opts.slotLockCount ?? 1 }),
    },
    appointment: {
      create: vi.fn().mockResolvedValue({ id: "appt_1", provider: { name: "Dr. Reddy" } }),
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/appointments/create", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Validation ────────────────────────────────────────────────────────────

  it("returns 400 when required fields are missing", async () => {
    const { consentText: _omit, ...body } = VALID_BODY as any;
    const res = await POST(makeReq(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/missing/i);
  });

  it("returns 400 for an invalid phone number", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, phone: "not-a-number" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/phone/i);
  });

  it("returns 400 when patient name exceeds 100 characters", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, name: "A".repeat(101) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/name/i);
  });

  // ── Rate limiting ─────────────────────────────────────────────────────────

  it("returns 429 when rate limit is exceeded", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockReturnValueOnce({ allowed: false, retryAfterSec: 30 });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it("creates an appointment and returns appointmentId + amount", async () => {
    const tx = makeTx();
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: Function) => fn(tx),
    );

    const res = await POST(makeReq(VALID_BODY));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ appointmentId: "appt_1", amount: 50_000 });
    expect(tx.slot.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isBooked: false }) }),
    );
    expect(tx.appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING", feePaise: 50_000 }) }),
    );
  });

  // ── Double-booking prevention ─────────────────────────────────────────────

  it("returns 409 when the slot is taken just before the lock", async () => {
    const tx = makeTx({ slotLockCount: 0 }); // atomic lock returns 0 — slot was taken
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: Function) => fn(tx),
    );

    const res = await POST(makeReq(VALID_BODY));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/slot/i);
  });

  it("returns 409 when slot is already marked isBooked in DB", async () => {
    const tx = makeTx();
    tx.slot.findUnique = vi.fn().mockResolvedValue({
      providerId: "prov_1",
      startsAt: new Date(Date.now() + 86_400_000),
      feePaise: 50_000,
      isBooked: true, // pre-booked
      provider: { defaultFeePaise: null },
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: Function) => fn(tx),
    );

    const res = await POST(makeReq(VALID_BODY));

    expect(res.status).toBe(409);
  });
});

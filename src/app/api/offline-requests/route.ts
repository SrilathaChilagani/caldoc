import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { buildPatientPhoneMeta } from "@/lib/phone";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const OFFLINE_IP_LIMIT    = { maxRequests: 5,  windowMs: 60 * 60_000 };       // 5/hr per IP
const OFFLINE_PHONE_LIMIT = { maxRequests: 3,  windowMs: 24 * 60 * 60_000 };  // 3/day per phone

const RequestSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  speciality: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ipRl = checkRateLimit(getClientIp(req.headers), OFFLINE_IP_LIMIT);
  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipRl.retryAfterSec) } },
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const phoneMeta = buildPatientPhoneMeta(parsed.data.phone);
    if (phoneMeta) {
      const phoneRl = checkRateLimit(`offline:${phoneMeta.canonical}`, OFFLINE_PHONE_LIMIT);
      if (!phoneRl.allowed) {
        return NextResponse.json(
          { error: "Too many requests for this number. Please try again tomorrow." },
          { status: 429, headers: { "Retry-After": String(phoneRl.retryAfterSec) } },
        );
      }
    }

    await prisma.offlineRequest.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        speciality: parsed.data.speciality,
        notes: parsed.data.notes,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

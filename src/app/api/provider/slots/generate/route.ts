import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminSession, readProviderSession } from "@/lib/auth.server";

const DEFAULT_FEE_PAISE = 100;

export async function POST(req: NextRequest) {
  const adminSess = await requireAdminSession();
  const providerSess = adminSess ? null : await readProviderSession();
  if (!adminSess && !providerSess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const providerInput = String(body.providerId || body.provider || "").trim();
    const date = String(body.date || "");
    const toDateInput = body.toDate ? String(body.toDate) : null;
    const start = String(body.start || "09:00");
    const end = String(body.end || "17:00");
    const intervalMins = Number(body.intervalMins || 30);

    if (!providerInput) {
      return NextResponse.json({ error: "providerId is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }
    if (!intervalMins || intervalMins < 5) {
      return NextResponse.json({ error: "intervalMins must be >= 5" }, { status: 400 });
    }

    const provider = await prisma.provider.findFirst({
      where: {
        OR: [{ id: providerInput }, { slug: providerInput }],
      },
      select: { id: true, defaultFeePaise: true },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    if (providerSess && provider.id !== providerSess.pid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const explicitFeePaise = normalizeFeePaise(body);

    const fromDay = new Date(`${date}T00:00:00`);
    if (isNaN(fromDay.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const toDay =
      toDateInput && toDateInput.trim()
        ? new Date(`${toDateInput}T00:00:00`)
        : new Date(fromDay);
    if (isNaN(toDay.getTime())) {
      return NextResponse.json({ error: "Invalid toDate" }, { status: 400 });
    }
    if (toDay < fromDay) {
      return NextResponse.json({ error: "toDate must be after date" }, { status: 400 });
    }

    const days = eachDayRange(fromDay, toDay);
    let created = 0;

    for (const day of days) {
      const startDate = parseDateTimeISO(day, start);
      const endDate = parseDateTimeISO(day, end);
      if (!startDate || !endDate || !(startDate < endDate)) continue;

      const slots: { startsAt: Date; endsAt: Date }[] = [];
      let cursor = new Date(startDate);
      while (cursor < endDate) {
        const next = new Date(cursor.getTime() + intervalMins * 60 * 1000);
        if (next > endDate) break;
        slots.push({ startsAt: new Date(cursor), endsAt: next });
        cursor = next;
      }

      for (const slot of slots) {
        try {
          await prisma.slot.create({
            data: {
              providerId: provider.id,
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              feePaise: explicitFeePaise ?? provider.defaultFeePaise ?? DEFAULT_FEE_PAISE,
            },
          });
          created += 1;
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            // duplicate slot, ignore
          } else {
            throw err;
          }
        }
      }
    }

    return NextResponse.json({ ok: true, count: created });
  } catch (err) {
    console.error("slot generator error:", err);
    return NextResponse.json(
      { error: "Failed to generate slots" },
      { status: 500 }
    );
  }
}

function parseDateTimeISO(day: Date, time: string) {
  if (!time) return null;
  const isoDate = day.toISOString().slice(0, 10);
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  const iso = `${isoDate}T${normalizedTime}`;
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

function eachDayRange(start: Date, end: Date) {
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function normalizeFeePaise(body: Record<string, unknown>): number | null {
  if (body == null) return null;

  const rawPaise = body.feePaise ?? body.feeAmountPaise ?? body.amountPaise;
  if (typeof rawPaise === "number" && Number.isFinite(rawPaise) && rawPaise > 0) {
    return Math.round(rawPaise);
  }
  if (typeof rawPaise === "string" && rawPaise.trim()) {
    const parsed = parseInt(rawPaise.trim(), 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const rawRupees = body.feeRupees ?? body.feeAmount ?? body.amountRupees;
  if (typeof rawRupees === "number" && Number.isFinite(rawRupees) && rawRupees > 0) {
    return Math.round(rawRupees * 100);
  }
  if (typeof rawRupees === "string" && rawRupees.trim()) {
    const parsed = Number(rawRupees.trim());
    if (!Number.isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 100);
    }
  }

  return null;
}

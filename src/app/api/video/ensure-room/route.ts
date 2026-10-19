import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";
import { readPatientPhone } from "@/lib/patientAuth.server";
import { verifyPatientMobileToken } from "@/lib/patientMobileToken";
import { requireProviderSession, requireAdminSession } from "@/lib/auth.server";

const DAILY_API_BASE = "https://api.daily.co/v1";

async function getDailyHeaders() {
  const apiKey = process.env.DAILY_API_KEY;
  const dailyDomain = process.env.DAILY_DOMAIN || process.env.NEXT_PUBLIC_DAILY_DOMAIN;
  if (!apiKey || !dailyDomain) {
    throw new Error("Daily.co is not configured. Set DAILY_API_KEY and DAILY_DOMAIN.");
  }
  return {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    dailyDomain,
  };
}

async function ensureDailyRoom(roomName: string): Promise<string> {
  const { headers, dailyDomain } = await getDailyHeaders();

  const checkRes = await fetch(`${DAILY_API_BASE}/rooms/${encodeURIComponent(roomName)}`, {
    headers,
    cache: "no-store",
  });
  if (checkRes.ok) {
    const data = (await checkRes.json()) as { url: string };
    return data.url ?? `https://${dailyDomain}/${roomName}`;
  }
  if (checkRes.status !== 404) {
    throw new Error(`Daily room lookup failed (${checkRes.status}): ${await checkRes.text()}`);
  }

  // Room expiry: 24 hours from now
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const createRes = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: roomName,
      privacy: "private",       // Require a meeting token to join
      properties: { exp },
    }),
  });
  if (!createRes.ok) {
    throw new Error(`Daily room create failed (${createRes.status}): ${await createRes.text()}`);
  }
  const created = (await createRes.json()) as { url: string };
  return created.url ?? `https://${dailyDomain}/${roomName}`;
}

/** Generate a Daily meeting token for a private room. */
async function createDailyToken(opts: {
  roomName: string;
  isOwner: boolean;
  userName: string;
}): Promise<string> {
  const { headers } = await getDailyHeaders();
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      properties: {
        room_name: opts.roomName,
        is_owner: opts.isOwner,
        user_name: opts.userName,
        exp,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Daily token create failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

// ─── Caller identity resolution ──────────────────────────────────────────────

type CallerIdentity =
  | { role: "patient"; phone: string; patientId?: string }
  | { role: "provider"; userId: string; providerId: string }
  | { role: "admin"; userId: string };

/**
 * Try each auth mechanism in priority order:
 *   1. Bearer token  → patient (mobile app)
 *   2. Patient cookie → patient (web)
 *   3. Provider cookie → provider (web)
 *   4. Admin cookie → admin (web)
 *
 * If a Bearer token is present but invalid, rejects immediately (no fallthrough).
 */
async function resolveCallerIdentity(req: NextRequest): Promise<CallerIdentity | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const claims = verifyPatientMobileToken(authHeader.slice(7));
      return {
        role: "patient",
        phone: claims.phone,
        patientId: claims.patientId ?? undefined,
      };
    } catch {
      // Malformed/expired Bearer token — reject; do not fall through to cookies
      return null;
    }
  }

  const patientPhone = await readPatientPhone();
  if (patientPhone) return { role: "patient", phone: patientPhone };

  const providerSess = await requireProviderSession();
  if (providerSess) {
    return { role: "provider", userId: providerSess.userId, providerId: providerSess.providerId };
  }

  const adminSess = await requireAdminSession();
  if (adminSess) return { role: "admin", userId: adminSess.userId };

  return null;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Who is calling?
    const caller = await resolveCallerIdentity(req);
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { appointmentId?: string };
    const appointmentId = body?.appointmentId;
    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    // 2. Fetch appointment with enough detail for the ownership check
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        videoRoom: true,
        providerId: true,
        patientId: true,
        patient: { select: { phone: true, name: true } },
        provider: { select: { name: true } },
      },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // 3. Ownership check — verified phone/providerId must match the appointment
    let isOwner: boolean;
    let userName: string;

    if (caller.role === "patient") {
      // Accept match on patientId (mobile token) or phone (web cookie)
      const authorized = caller.patientId
        ? appointment.patientId === caller.patientId
        : appointment.patient?.phone === caller.phone;
      if (!authorized) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      isOwner = false;
      userName = appointment.patient?.name || "Patient";
    } else if (caller.role === "provider") {
      if (appointment.providerId !== caller.providerId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      isOwner = true;
      userName = appointment.provider?.name || "Doctor";
    } else {
      // admin — can access any appointment's room
      isOwner = true;
      userName = "Admin";
    }

    // 4. Fallback path: Daily not configured, use /room/:id
    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      let roomUrl = appointment.videoRoom;
      if (!roomUrl) {
        const baseUrl =
          process.env.APP_BASE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "https://www.caldoc.in";
        roomUrl = `${baseUrl}/room/${appointmentId}`;
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { videoRoom: roomUrl },
        });
      }
      return NextResponse.json({ url: roomUrl });
    }

    // 5. Daily path: ensure private room + issue a per-caller token
    const roomName = `caldoc-${appointmentId}`;
    const roomUrl = await ensureDailyRoom(roomName);

    if (!appointment.videoRoom) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { videoRoom: roomUrl },
      }).catch(() => {});
    }

    const token = await createDailyToken({ roomName, isOwner, userName });

    return NextResponse.json({ url: `${roomUrl}?t=${token}` });
  } catch (err) {
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

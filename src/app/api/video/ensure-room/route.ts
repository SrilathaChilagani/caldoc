import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      appointmentId?: string;
      userName?: string;
      isProvider?: boolean;
    };
    const appointmentId = body?.appointmentId;
    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { videoRoom: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const urlSearchParams = new URL(req.url).searchParams;
    const providerMode = urlSearchParams.get("provider");
    const isProvider = body?.isProvider ?? providerMode === "daily";
    const userName = body?.userName || (isProvider ? "Doctor" : "Patient");

    // Fallback path: Daily not configured, use /room/:id
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

    // Daily path: ensure private room + return token URL
    const roomName = `caldoc-${appointmentId}`;
    const roomUrl = await ensureDailyRoom(roomName);

    // Persist the base room URL on the appointment if not set
    if (!appointment.videoRoom) {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { videoRoom: roomUrl },
      }).catch(() => {});
    }

    const token = await createDailyToken({
      roomName,
      isOwner: isProvider,
      userName,
    });

    return NextResponse.json({ url: `${roomUrl}?t=${token}` });
  } catch (err) {
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

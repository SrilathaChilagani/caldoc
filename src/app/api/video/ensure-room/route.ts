import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

const DAILY_API_BASE = "https://api.daily.co/v1";

async function ensureDailyRoomUrl(roomName: string) {
  const apiKey = process.env.DAILY_API_KEY;
  const dailyDomain = process.env.DAILY_DOMAIN || process.env.NEXT_PUBLIC_DAILY_DOMAIN;
  if (!apiKey || !dailyDomain) {
    throw new Error("Daily.co is not configured. Set DAILY_API_KEY and DAILY_DOMAIN.");
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const checkRes = await fetch(`${DAILY_API_BASE}/rooms/${encodeURIComponent(roomName)}`, {
    headers,
    cache: "no-store",
  });
  if (checkRes.ok) {
    const data = (await checkRes.json()) as { url: string };
    return data.url ?? `https://${dailyDomain}/${roomName}`;
  }
  if (checkRes.status !== 404) {
    const body = await checkRes.text();
    throw new Error(`Daily room lookup failed (${checkRes.status}): ${body}`);
  }

  const createRes = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: roomName,
      privacy: "public",
      properties: {
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      },
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Daily room create failed (${createRes.status}): ${body}`);
  }
  const created = (await createRes.json()) as { url: string };
  return created.url ?? `https://${dailyDomain}/${roomName}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { appointmentId?: string };
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

    let roomUrl = appointment.videoRoom;

    if (providerMode === "daily") {
      const dailyUrl = await ensureDailyRoomUrl(`caldoc-${appointmentId}`);
      return NextResponse.json({ url: dailyUrl });
    }

    if (!roomUrl) {
      // Use the trusted server-side base URL — never use the request Origin header
      // as it can be spoofed, causing video room links to point to attacker domains.
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
  } catch (err) {
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

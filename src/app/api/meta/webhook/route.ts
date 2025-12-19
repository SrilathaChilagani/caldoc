import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/errors";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;

type MetaStatus = {
  id?: string;
  status?: string;
  errors?: { code?: number; title?: string; message?: string; detail?: string }[];
};

function normalizeStatus(status?: string | null) {
  if (!status) return "UNKNOWN";
  switch (status.toLowerCase()) {
    case "failed":
      return "FAILED";
    case "sent":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    default:
      return status.toUpperCase();
  }
}

function extractStatuses(body: any): MetaStatus[] {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const statuses: MetaStatus[] = [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const valueStatuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : [];
      for (const status of valueStatuses) {
        statuses.push(status as MetaStatus);
      }
    }
  }
  return statuses;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (!VERIFY_TOKEN) {
    return NextResponse.json({ error: "META_WEBHOOK_VERIFY_TOKEN not set" }, { status: 500 });
  }

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const statuses = extractStatuses(body);
    if (!statuses.length) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    const updates = statuses
      .map((status) => {
        const messageId = status.id;
        if (!messageId) return null;
        const normalized = normalizeStatus(status.status);
        const errorPayload = status.errors && status.errors.length ? JSON.stringify(status.errors[0]) : null;
        return prisma.outboundMessage.updateMany({
          where: { messageId },
          data: { status: normalized, error: errorPayload || undefined },
        });
      })
      .filter(Boolean) as Promise<unknown>[];

    if (updates.length) {
      await Promise.all(updates);
    }

    const baseId = body?.entry?.[0]?.id ? String(body.entry[0].id) : "meta";
    const eventId = `${baseId}-${Date.now()}`;
    await prisma.webhookEvent.create({
      data: {
        source: "META_WHATSAPP",
        eventId,
        type: "WHATSAPP_STATUS",
        payload: body,
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, processed: updates.length });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 400 });
  }
}

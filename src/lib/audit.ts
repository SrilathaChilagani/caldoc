"use server";

import { prisma } from "@/lib/db";
import { getErrorMessage } from "./errors";
import { Prisma } from "@prisma/client";

type ActorType = "PROVIDER" | "ADMIN" | "PATIENT" | "SYSTEM";

type AuditEntry = {
  action: string;
  actorType: ActorType;
  actorId?: string | null;
  meta?: Record<string, unknown>;
};

export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorType: entry.actorType,
        actorId: entry.actorId ?? null,
        meta: entry.meta ? (entry.meta as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error("audit log insert failed", getErrorMessage(err));
  }
}

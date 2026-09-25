import { prisma } from "@/lib/db";
import type { LabOrderPayload, LabDispatchResult } from "./types";
import type { LabAdapter } from "./types";
import { manualAdapter } from "./adapters/manual";
import { thyrocareAdapter } from "./adapters/thyrocare";
import { redcliffeAdapter } from "./adapters/redcliffe";

function getAdapter(apiType: string | null | undefined): LabAdapter {
  switch (apiType) {
    case "THYROCARE": return thyrocareAdapter;
    case "REDCLIFFE": return redcliffeAdapter;
    default:          return manualAdapter;
  }
}

/**
 * Dispatch a LabOrder to the assigned lab partner's API.
 * Records dispatchStatus / externalOrderId / dispatchError on the order.
 * Safe to call multiple times — skips orders already dispatched.
 */
export async function dispatchLabOrder(labOrderId: string): Promise<void> {
  const order = await prisma.labOrder.findUnique({
    where: { id: labOrderId },
    select: {
      id: true,
      dispatchStatus: true,
      patientName: true,
      patientPhone: true,
      patientEmail: true,
      tests: true,
      address: true,
      deliveryMode: true,
      notes: true,
      amountPaise: true,
      labPartnerId: true,
      labPartner: {
        select: {
          apiType: true,
          apiBaseUrl: true,
          apiKeyEnvVar: true,
          apiSecretEnvVar: true,
        },
      },
    },
  });

  if (!order) throw new Error(`LabOrder ${labOrderId} not found`);
  if (order.dispatchStatus === "DISPATCHED") return;
  if (!order.labPartnerId) {
    await prisma.labOrder.update({
      where: { id: labOrderId },
      data: { dispatchStatus: "PENDING", dispatchError: "No lab partner assigned" },
    });
    return;
  }

  const partner = order.labPartner!;
  const apiType = partner.apiType;

  if (!apiType || apiType === "MANUAL") {
    await prisma.labOrder.update({
      where: { id: labOrderId },
      data: { dispatchStatus: "DISPATCHED", externalOrderId: `MANUAL-${labOrderId}`, dispatchedAt: new Date() },
    });
    return;
  }

  const apiKey = partner.apiKeyEnvVar ? process.env[partner.apiKeyEnvVar] : undefined;
  const apiSecret = partner.apiSecretEnvVar ? process.env[partner.apiSecretEnvVar] : undefined;

  if (!apiKey || !partner.apiBaseUrl) {
    await prisma.labOrder.update({
      where: { id: labOrderId },
      data: { dispatchStatus: "FAILED", dispatchError: "Missing API credentials or base URL" },
    });
    return;
  }

  const adapter = getAdapter(apiType);
  const payload: LabOrderPayload = {
    orderId:      order.id,
    patient:      { name: order.patientName ?? "", phone: order.patientPhone ?? "", email: order.patientEmail },
    tests:        (order.tests as unknown[]) ?? [],
    address:      order.address as Record<string, unknown> | null,
    deliveryMode: order.deliveryMode,
    notes:        order.notes,
    amountPaise:  order.amountPaise,
  };

  let result: LabDispatchResult;
  try {
    result = await adapter.dispatch(payload, { apiBaseUrl: partner.apiBaseUrl, apiKey, apiSecret });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.labOrder.update({
      where: { id: labOrderId },
      data: { dispatchStatus: "FAILED", dispatchError: message.slice(0, 500) },
    });
    return;
  }

  await prisma.labOrder.update({
    where: { id: labOrderId },
    data: {
      dispatchStatus:  "DISPATCHED",
      externalOrderId: result.externalOrderId,
      dispatchError:   null,
      dispatchedAt:    new Date(),
    },
  });
}

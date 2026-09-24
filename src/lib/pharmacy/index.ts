import { prisma } from "@/lib/db";
import type { PharmacyOrderPayload, PharmacyDispatchResult } from "./types";
import { manualAdapter } from "./adapters/manual";
import { pharmEasyAdapter } from "./adapters/pharmeasy";
import { oneMgAdapter } from "./adapters/onemg";
import type { PharmacyAdapter } from "./types";

function getAdapter(apiType: string | null | undefined): PharmacyAdapter {
  switch (apiType) {
    case "PHARMEASY": return pharmEasyAdapter;
    case "1MG":       return oneMgAdapter;
    default:          return manualAdapter;
  }
}

/**
 * Dispatch an RxOrder to the assigned pharmacy partner's API.
 * Records dispatchStatus / externalOrderId / dispatchError on the order.
 * Safe to call multiple times — skips orders already dispatched.
 */
export async function dispatchRxOrder(rxOrderId: string): Promise<void> {
  const order = await prisma.rxOrder.findUnique({
    where: { id: rxOrderId },
    select: {
      id: true,
      dispatchStatus: true,
      patientName: true,
      patientPhone: true,
      patientEmail: true,
      address: true,
      items: true,
      rxDocumentKey: true,
      notes: true,
      amountPaise: true,
      pharmacyPartnerId: true,
      pharmacyPartner: {
        select: {
          apiType: true,
          apiBaseUrl: true,
          apiKeyEnvVar: true,
          apiSecretEnvVar: true,
        },
      },
    },
  });

  if (!order) throw new Error(`RxOrder ${rxOrderId} not found`);
  if (order.dispatchStatus === "DISPATCHED") return; // already done
  if (!order.pharmacyPartnerId) {
    await prisma.rxOrder.update({
      where: { id: rxOrderId },
      data: { dispatchStatus: "PENDING", dispatchError: "No pharmacy partner assigned" },
    });
    return;
  }

  const partner = order.pharmacyPartner!;
  const apiType = partner.apiType;

  // MANUAL partners: mark dispatched immediately (portal flow)
  if (!apiType || apiType === "MANUAL") {
    await prisma.rxOrder.update({
      where: { id: rxOrderId },
      data: { dispatchStatus: "DISPATCHED", externalOrderId: `MANUAL-${rxOrderId}`, dispatchedAt: new Date() },
    });
    return;
  }

  // API partners: resolve credentials from env vars
  const apiKey = partner.apiKeyEnvVar ? process.env[partner.apiKeyEnvVar] : undefined;
  const apiSecret = partner.apiSecretEnvVar ? process.env[partner.apiSecretEnvVar] : undefined;

  if (!apiKey || !partner.apiBaseUrl) {
    await prisma.rxOrder.update({
      where: { id: rxOrderId },
      data: { dispatchStatus: "FAILED", dispatchError: "Missing API credentials or base URL" },
    });
    return;
  }

  const adapter = getAdapter(apiType);
  const payload: PharmacyOrderPayload = {
    orderId:      order.id,
    patient:      { name: order.patientName, phone: order.patientPhone, email: order.patientEmail },
    address:      order.address as Record<string, unknown>,
    items:        order.items as unknown[],
    rxDocumentKey: order.rxDocumentKey,
    notes:        order.notes,
    amountPaise:  order.amountPaise,
  };

  let result: PharmacyDispatchResult;
  try {
    result = await adapter.dispatch(payload, { apiBaseUrl: partner.apiBaseUrl, apiKey, apiSecret });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.rxOrder.update({
      where: { id: rxOrderId },
      data: { dispatchStatus: "FAILED", dispatchError: message.slice(0, 500) },
    });
    return;
  }

  await prisma.rxOrder.update({
    where: { id: rxOrderId },
    data: {
      dispatchStatus:  "DISPATCHED",
      externalOrderId: result.externalOrderId,
      dispatchError:   null,
      dispatchedAt:    new Date(),
    },
  });
}

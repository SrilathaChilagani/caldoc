import type { PharmacyAdapter, PharmacyOrderPayload, PharmacyDispatchResult, PartnerApiConfig } from "../types";
import { fetchWithBackoff } from "@/lib/fetchWithBackoff";

// PharmEasy status → CalDoc RxOrder status
const STATUS_MAP: Record<string, string> = {
  confirmed:  "PROCESSING",
  packed:     "PROCESSING",
  shipped:    "DISPATCHED",
  delivered:  "DELIVERED",
  cancelled:  "CANCELLED",
  returned:   "CANCELLED",
};

export const pharmEasyAdapter: PharmacyAdapter = {
  async dispatch(payload: PharmacyOrderPayload, config: PartnerApiConfig): Promise<PharmacyDispatchResult> {
    const res = await fetchWithBackoff(`${config.apiBaseUrl}/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        ...(config.apiSecret ? { "x-api-secret": config.apiSecret } : {}),
      },
      body: JSON.stringify({
        reference_id:    payload.orderId,
        customer_name:   payload.patient.name,
        customer_phone:  payload.patient.phone,
        customer_email:  payload.patient.email ?? undefined,
        delivery_address: payload.address,
        items:           payload.items,
        prescription_key: payload.rxDocumentKey ?? undefined,
        notes:           payload.notes ?? undefined,
        order_value:     payload.amountPaise,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`PharmEasy dispatch failed ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { order_id: string };
    return { externalOrderId: data.order_id, raw: data };
  },

  mapStatus(externalStatus: string): string | null {
    return STATUS_MAP[externalStatus.toLowerCase()] ?? null;
  },
};

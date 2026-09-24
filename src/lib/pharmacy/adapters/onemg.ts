import type { PharmacyAdapter, PharmacyOrderPayload, PharmacyDispatchResult, PartnerApiConfig } from "../types";
import { fetchWithBackoff } from "@/lib/fetchWithBackoff";

// 1mg status → CalDoc RxOrder status
const STATUS_MAP: Record<string, string> = {
  order_placed:    "PROCESSING",
  order_confirmed: "PROCESSING",
  order_packed:    "PROCESSING",
  order_shipped:   "DISPATCHED",
  out_for_delivery:"DISPATCHED",
  delivered:       "DELIVERED",
  cancelled:       "CANCELLED",
  returned:        "CANCELLED",
};

export const oneMgAdapter: PharmacyAdapter = {
  async dispatch(payload: PharmacyOrderPayload, config: PartnerApiConfig): Promise<PharmacyDispatchResult> {
    const res = await fetchWithBackoff(`${config.apiBaseUrl}/api/v2/partner/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        partner_order_id:  payload.orderId,
        patient: {
          name:  payload.patient.name,
          phone: payload.patient.phone,
          email: payload.patient.email ?? undefined,
        },
        delivery_address: payload.address,
        products:         payload.items,
        prescription_s3_key: payload.rxDocumentKey ?? undefined,
        special_instructions: payload.notes ?? undefined,
        total_mrp:        payload.amountPaise,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`1mg dispatch failed ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { data: { order_id: string } };
    return { externalOrderId: data.data.order_id, raw: data };
  },

  mapStatus(externalStatus: string): string | null {
    return STATUS_MAP[externalStatus.toLowerCase()] ?? null;
  },
};

import type { LabAdapter, LabOrderPayload, LabDispatchResult, PartnerApiConfig } from "../types";
import { fetchWithBackoff } from "@/lib/fetchWithBackoff";

// Redcliffe status → CalDoc LabOrder status
const STATUS_MAP: Record<string, string> = {
  pending:          "CONFIRMED",
  confirmed:        "CONFIRMED",
  agent_assigned:   "CONFIRMED",
  sample_collected: "SAMPLE_COLLECTED",
  in_transit:       "PROCESSING",
  under_processing: "PROCESSING",
  report_generated: "REPORTS_READY",
  report_ready:     "REPORTS_READY",
  completed:        "COMPLETED",
  cancelled:        "CANCELLED",
};

export const redcliffeAdapter: LabAdapter = {
  async dispatch(payload: LabOrderPayload, config: PartnerApiConfig): Promise<LabDispatchResult> {
    const res = await fetchWithBackoff(`${config.apiBaseUrl}/partner/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": config.apiKey,
        ...(config.apiSecret ? { "X-Api-Secret": config.apiSecret } : {}),
      },
      body: JSON.stringify({
        partner_order_id: payload.orderId,
        patient: {
          name:  payload.patient.name,
          phone: payload.patient.phone,
          email: payload.patient.email ?? undefined,
        },
        collection_type: payload.deliveryMode === "WALK_IN" ? "centre" : "home",
        address:         payload.address ?? undefined,
        tests:           payload.tests,
        special_notes:   payload.notes ?? undefined,
        amount:          payload.amountPaise ?? undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Redcliffe dispatch failed ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { data: { order_id: string } };
    return { externalOrderId: data.data.order_id, raw: data };
  },

  mapStatus(externalStatus: string): string | null {
    return STATUS_MAP[externalStatus.toLowerCase().replace(/\s+/g, "_")] ?? null;
  },
};

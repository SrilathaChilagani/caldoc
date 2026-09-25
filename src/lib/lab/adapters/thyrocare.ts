import type { LabAdapter, LabOrderPayload, LabDispatchResult, PartnerApiConfig } from "../types";
import { fetchWithBackoff } from "@/lib/fetchWithBackoff";

// Thyrocare status → CalDoc LabOrder status
const STATUS_MAP: Record<string, string> = {
  booked:           "CONFIRMED",
  order_confirmed:  "CONFIRMED",
  agent_assigned:   "CONFIRMED",
  sample_collected: "SAMPLE_COLLECTED",
  in_lab:           "PROCESSING",
  processing:       "PROCESSING",
  report_ready:     "REPORTS_READY",
  report_uploaded:  "REPORTS_READY",
  completed:        "COMPLETED",
  cancelled:        "CANCELLED",
  rejected:         "CANCELLED",
};

export const thyrocareAdapter: LabAdapter = {
  async dispatch(payload: LabOrderPayload, config: PartnerApiConfig): Promise<LabDispatchResult> {
    const res = await fetchWithBackoff(`${config.apiBaseUrl}/api/Order/BookOrder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: config.apiKey,
      },
      body: JSON.stringify({
        referenceId:   payload.orderId,
        patientName:   payload.patient.name,
        mobile:        payload.patient.phone,
        email:         payload.patient.email ?? undefined,
        address:       payload.address ?? undefined,
        serviceType:   payload.deliveryMode === "WALK_IN" ? "centre" : "home",
        products:      payload.tests,
        remarks:       payload.notes ?? undefined,
        orderAmount:   payload.amountPaise ?? undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Thyrocare dispatch failed ${res.status}: ${body}`);
    }

    const data = (await res.json()) as { orderId: string };
    return { externalOrderId: data.orderId, raw: data };
  },

  mapStatus(externalStatus: string): string | null {
    return STATUS_MAP[externalStatus.toLowerCase().replace(/\s+/g, "_")] ?? null;
  },
};

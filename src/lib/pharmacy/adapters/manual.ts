import type { PharmacyAdapter, PharmacyOrderPayload, PharmacyDispatchResult, PartnerApiConfig } from "../types";

/**
 * No-op adapter for manually-fulfilled pharmacy partners.
 * The partner logs into the portal and processes the order themselves.
 * "Dispatching" just returns a synthetic external ID so the dispatch
 * pipeline stays consistent — no actual API call is made.
 */
export const manualAdapter: PharmacyAdapter = {
  async dispatch(payload: PharmacyOrderPayload, _config: PartnerApiConfig): Promise<PharmacyDispatchResult> {
    return { externalOrderId: `MANUAL-${payload.orderId}` };
  },

  mapStatus(_externalStatus: string): string | null {
    return null;
  },
};

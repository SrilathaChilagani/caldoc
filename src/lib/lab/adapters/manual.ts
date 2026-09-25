import type { LabAdapter, LabOrderPayload, LabDispatchResult, PartnerApiConfig } from "../types";

/**
 * No-op adapter for manually-fulfilled lab partners.
 * Lab staff log into the portal to assign collection agents and update status.
 */
export const manualAdapter: LabAdapter = {
  async dispatch(payload: LabOrderPayload, _config: PartnerApiConfig): Promise<LabDispatchResult> {
    return { externalOrderId: `MANUAL-${payload.orderId}` };
  },

  mapStatus(_externalStatus: string): string | null {
    return null;
  },
};

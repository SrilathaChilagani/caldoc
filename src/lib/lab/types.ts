export type LabOrderPayload = {
  orderId: string;
  patient: {
    name: string;
    phone: string;
    email?: string | null;
  };
  tests: unknown[];
  address?: Record<string, unknown> | null;
  deliveryMode?: string | null;
  notes?: string | null;
  amountPaise?: number | null;
};

export type LabDispatchResult = {
  externalOrderId: string;
  raw?: unknown;
};

export type PartnerApiConfig = {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret?: string;
};

export interface LabAdapter {
  /**
   * Book a lab order with the partner's API (home collection or walk-in).
   * Must be idempotent — safe to retry on network failure.
   */
  dispatch(
    payload: LabOrderPayload,
    config: PartnerApiConfig,
  ): Promise<LabDispatchResult>;

  /**
   * Map an inbound status string from the partner's webhook to one of
   * CalDoc's LabOrder statuses:
   * CONFIRMED | SAMPLE_COLLECTED | PROCESSING | REPORTS_READY | COMPLETED | CANCELLED
   * Return null if the status is unknown / not actionable.
   */
  mapStatus(externalStatus: string): string | null;
}

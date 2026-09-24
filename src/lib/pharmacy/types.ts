export type PharmacyOrderPayload = {
  orderId: string;
  patient: {
    name: string;
    phone: string;
    email?: string | null;
  };
  address: Record<string, unknown>;
  items: unknown[];
  rxDocumentKey?: string | null;
  notes?: string | null;
  amountPaise: number;
};

export type PharmacyDispatchResult = {
  externalOrderId: string;
  raw?: unknown;
};

export type PartnerApiConfig = {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret?: string;
};

export interface PharmacyAdapter {
  /**
   * Place an order with the pharmacy partner's API.
   * Must be idempotent — safe to retry on network failure.
   */
  dispatch(
    payload: PharmacyOrderPayload,
    config: PartnerApiConfig,
  ): Promise<PharmacyDispatchResult>;

  /**
   * Map an inbound status string from the partner's webhook
   * to one of CalDoc's RxOrder statuses:
   * PROCESSING | DISPATCHED | DELIVERED | CANCELLED
   * Return null if the status is unknown / not actionable.
   */
  mapStatus(externalStatus: string): string | null;
}

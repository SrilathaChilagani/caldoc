type ItemPayload = { qty: number };

export const RX_DELIVERY_UNIT_PRICE_PAISE = Number(process.env.RX_DELIVERY_ITEM_PAISE || 19900);

export function computeRxDeliveryAmount(items: ItemPayload[]) {
  if (!items.length) return 0;
  return items.reduce(
    (sum, item) => sum + Math.max(1, Number(item.qty) || 0) * RX_DELIVERY_UNIT_PRICE_PAISE,
    0,
  );
}

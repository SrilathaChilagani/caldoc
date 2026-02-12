export type LabCartItem = {
  name: string;
  qty: number;
};

const STORAGE_KEY = "labDeliveryCart";
export const LAB_CART_EVENT = "lab-cart-updated";

function normalizeItem(item: LabCartItem): LabCartItem | null {
  const name = String(item.name || "").trim();
  if (!name) return null;
  const qty = Math.max(1, Number(item.qty) || 1);
  return { name, qty };
}

export function loadLabCart(): LabCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LabCartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeItem(item)).filter(Boolean) as LabCartItem[];
  } catch {
    return [];
  }
}

export function saveLabCart(items: LabCartItem[]) {
  if (typeof window === "undefined") return;
  const normalized = items.map((item) => normalizeItem(item)).filter(Boolean) as LabCartItem[];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event(LAB_CART_EVENT));
}

export function clearLabCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(LAB_CART_EVENT));
}

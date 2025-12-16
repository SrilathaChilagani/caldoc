export function formatINR(paise?: number | null) {
  if (typeof paise !== "number" || Number.isNaN(paise) || paise <= 0) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

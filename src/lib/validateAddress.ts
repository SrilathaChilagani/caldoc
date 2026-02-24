/**
 * Address validation for Indian addresses.
 * Returns an array of validation issues (empty = valid).
 */

export type AddressLike = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
};

export type ValidationIssue = { field: string; message: string };

/** Valid Indian states and UTs */
const INDIAN_STATES = new Set([
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]);

/** Indian mobile: exactly 10 digits, starts with 6-9 (with optional +91 or 0 prefix) */
function isValidIndianPhone(phone: string) {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  const stripped = cleaned.replace(/^(\+91|91|0)/, "");
  return /^[6-9]\d{9}$/.test(stripped);
}

/** Indian pincode: exactly 6 digits, doesn't start with 0 */
function isValidPincode(pin: string) {
  return /^[1-9]\d{5}$/.test(pin.trim());
}

export function validateAddress(addr: AddressLike | null | undefined): ValidationIssue[] {
  if (!addr) return [{ field: "address", message: "Address is missing" }];
  const issues: ValidationIssue[] = [];

  if (!addr.line1?.trim()) issues.push({ field: "line1", message: "Street address (line 1) is required" });
  if (!addr.city?.trim()) issues.push({ field: "city", message: "City is required" });
  if (!addr.state?.trim()) {
    issues.push({ field: "state", message: "State is required" });
  } else if (!INDIAN_STATES.has(addr.state.trim())) {
    issues.push({ field: "state", message: `"${addr.state}" is not a recognised Indian state/UT` });
  }

  if (!addr.postalCode?.trim()) {
    issues.push({ field: "postalCode", message: "PIN code is required" });
  } else if (!isValidPincode(addr.postalCode)) {
    issues.push({ field: "postalCode", message: `PIN code "${addr.postalCode}" must be 6 digits and not start with 0` });
  }

  if (addr.contactPhone?.trim() && !isValidIndianPhone(addr.contactPhone)) {
    issues.push({ field: "contactPhone", message: "Phone number does not appear to be a valid Indian mobile number" });
  }

  return issues;
}

/** Returns true if address passes all validations */
export function isAddressValid(addr: AddressLike | null | undefined): boolean {
  return validateAddress(addr).length === 0;
}

/** Formats an address object into a single readable string */
export function formatAddress(addr: Record<string, unknown> | null | undefined): string {
  if (!addr) return "";
  const parts = [
    addr.line1, addr.line2, addr.city, addr.state, addr.postalCode,
  ].map((p) => String(p || "").trim()).filter(Boolean);
  return parts.join(", ");
}

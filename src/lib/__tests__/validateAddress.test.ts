import { describe, it, expect } from "vitest";
import { validateAddress, isAddressValid, formatAddress } from "../validateAddress";

const VALID_ADDR = {
  line1: "12 MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  postalCode: "560001",
  contactName: "Raj Kumar",
  contactPhone: "9876543210",
};

describe("validateAddress", () => {
  it("returns no issues for a valid address", () => {
    expect(validateAddress(VALID_ADDR)).toEqual([]);
  });

  it("returns an issue for missing address", () => {
    const issues = validateAddress(null);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].field).toBe("address");
  });

  it("requires line1", () => {
    const issues = validateAddress({ ...VALID_ADDR, line1: "" });
    expect(issues.some((i) => i.field === "line1")).toBe(true);
  });

  it("requires city", () => {
    const issues = validateAddress({ ...VALID_ADDR, city: "" });
    expect(issues.some((i) => i.field === "city")).toBe(true);
  });

  it("requires state", () => {
    const issues = validateAddress({ ...VALID_ADDR, state: "" });
    expect(issues.some((i) => i.field === "state")).toBe(true);
  });

  it("rejects an unrecognised state", () => {
    const issues = validateAddress({ ...VALID_ADDR, state: "InvalidState" });
    expect(issues.some((i) => i.field === "state")).toBe(true);
  });

  it("accepts all 28 states and 8 UTs by name", () => {
    const validStates = ["Maharashtra", "Delhi", "Tamil Nadu", "West Bengal", "Telangana"];
    for (const state of validStates) {
      const issues = validateAddress({ ...VALID_ADDR, state });
      expect(issues.some((i) => i.field === "state")).toBe(false);
    }
  });

  it("requires postalCode", () => {
    const issues = validateAddress({ ...VALID_ADDR, postalCode: "" });
    expect(issues.some((i) => i.field === "postalCode")).toBe(true);
  });

  it("rejects a 5-digit PIN code", () => {
    const issues = validateAddress({ ...VALID_ADDR, postalCode: "56000" });
    expect(issues.some((i) => i.field === "postalCode")).toBe(true);
  });

  it("rejects a PIN starting with 0", () => {
    const issues = validateAddress({ ...VALID_ADDR, postalCode: "012345" });
    expect(issues.some((i) => i.field === "postalCode")).toBe(true);
  });

  it("accepts a valid 6-digit PIN code", () => {
    const issues = validateAddress({ ...VALID_ADDR, postalCode: "400001" });
    expect(issues.some((i) => i.field === "postalCode")).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    const issues = validateAddress({ ...VALID_ADDR, contactPhone: "1234567890" });
    expect(issues.some((i) => i.field === "contactPhone")).toBe(true);
  });

  it("accepts phone with +91 prefix", () => {
    const issues = validateAddress({ ...VALID_ADDR, contactPhone: "+919876543210" });
    expect(issues.some((i) => i.field === "contactPhone")).toBe(false);
  });

  it("skips phone validation when phone is empty", () => {
    const issues = validateAddress({ ...VALID_ADDR, contactPhone: "" });
    expect(issues.some((i) => i.field === "contactPhone")).toBe(false);
  });
});

describe("isAddressValid", () => {
  it("returns true for a valid address", () => {
    expect(isAddressValid(VALID_ADDR)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isAddressValid(null)).toBe(false);
  });

  it("returns false when a required field is missing", () => {
    expect(isAddressValid({ ...VALID_ADDR, city: "" })).toBe(false);
  });
});

describe("formatAddress", () => {
  it("joins all parts with commas", () => {
    const result = formatAddress({
      line1: "12 MG Road",
      line2: "Koramangala",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560034",
    });
    expect(result).toBe("12 MG Road, Koramangala, Bengaluru, Karnataka, 560034");
  });

  it("skips empty parts", () => {
    const result = formatAddress({ line1: "12 MG Road", city: "Bengaluru", state: "Karnataka", postalCode: "560001" });
    expect(result).toBe("12 MG Road, Bengaluru, Karnataka, 560001");
  });

  it("returns empty string for null", () => {
    expect(formatAddress(null)).toBe("");
  });
});

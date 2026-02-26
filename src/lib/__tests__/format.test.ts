import { describe, it, expect } from "vitest";
import { formatINR } from "../format";

describe("formatINR", () => {
  it("formats a positive paise value correctly", () => {
    expect(formatINR(50000)).toMatch(/500/); // ₹500.00
  });

  it("formats 100 paise as ₹1", () => {
    expect(formatINR(100)).toMatch(/1/);
  });

  it("returns em-dash for zero", () => {
    expect(formatINR(0)).toBe("—");
  });

  it("returns em-dash for null", () => {
    expect(formatINR(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(formatINR(undefined)).toBe("—");
  });

  it("returns em-dash for NaN", () => {
    expect(formatINR(NaN)).toBe("—");
  });

  it("returns em-dash for negative values", () => {
    expect(formatINR(-100)).toBe("—");
  });

  it("formats large amount correctly", () => {
    // 1,00,000 paise = ₹1,000.00
    expect(formatINR(100000)).toMatch(/1,000/);
  });
});

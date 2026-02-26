import { describe, it, expect, beforeAll } from "vitest";

// JWT_SECRET must be set before importing the module
beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-vitest-1234567890";
});

// Dynamic import so env is set first
async function getModule() {
  const mod = await import("../patientAuth.server");
  return mod;
}

describe("signPatientSession", () => {
  it("returns a JWT string", async () => {
    const { signPatientSession } = await getModule();
    const token = signPatientSession("+919876543210", "patient_abc");
    expect(typeof token).toBe("string");
    // JWT has 3 parts separated by dots
    expect(token.split(".").length).toBe(3);
  });

  it("produces different tokens for different phones", async () => {
    const { signPatientSession } = await getModule();
    const t1 = signPatientSession("+919876543210");
    const t2 = signPatientSession("+919999999999");
    expect(t1).not.toBe(t2);
  });
});

describe("PATIENT_COOKIE and PATIENT_MAX_AGE_DAYS", () => {
  it("exports the cookie name", async () => {
    const { PATIENT_COOKIE } = await getModule();
    expect(typeof PATIENT_COOKIE).toBe("string");
    expect(PATIENT_COOKIE.length).toBeGreaterThan(0);
  });

  it("exports a session duration in days", async () => {
    const { PATIENT_MAX_AGE_DAYS } = await getModule();
    expect(PATIENT_MAX_AGE_DAYS).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";

const SECRET = "test-secret-for-auth-tests";

// Mirror the logic from auth.server.ts to unit-test the JWT decode/normalise path
type DecodedSession = jwt.JwtPayload & {
  uid?: string;
  pid?: string;
  userId?: string;
  providerId?: string;
  role?: string;
  email?: string;
};

function normalizeDecoded(decoded: string | jwt.JwtPayload | null) {
  if (!decoded || typeof decoded !== "object") return null;
  const d = decoded as DecodedSession;
  const uid = d.uid ?? d.userId;
  const pid = d.pid ?? d.providerId;
  const role = d.role;
  const email = d.email;
  if (!uid || !pid || !role) return null;
  return { uid, pid, role, email };
}

describe("JWT session normalisation", () => {
  it("normalises a uid/pid/role payload", () => {
    const payload = { uid: "u1", pid: "p1", role: "provider" };
    const token = jwt.sign(payload, SECRET);
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    expect(normalizeDecoded(decoded)).toEqual(
      expect.objectContaining({ uid: "u1", pid: "p1", role: "provider" })
    );
  });

  it("also accepts legacy userId/providerId keys", () => {
    const payload = { userId: "u2", providerId: "p2", role: "provider" };
    const token = jwt.sign(payload, SECRET);
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    expect(normalizeDecoded(decoded)).toEqual(
      expect.objectContaining({ uid: "u2", pid: "p2", role: "provider" })
    );
  });

  it("returns null when role is missing", () => {
    const payload = { uid: "u3", pid: "p3" };
    const token = jwt.sign(payload, SECRET);
    const decoded = jwt.verify(token, SECRET) as jwt.JwtPayload;
    expect(normalizeDecoded(decoded)).toBeNull();
  });

  it("returns null for a string token (not decoded)", () => {
    expect(normalizeDecoded("raw-string")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(normalizeDecoded(null)).toBeNull();
  });

  it("throws on a tampered token", () => {
    const token = jwt.sign({ uid: "u4", pid: "p4", role: "admin" }, SECRET);
    const [header, payload, _sig] = token.split(".");
    const tamperedToken = `${header}.${payload}.invalidsig`;
    expect(() => jwt.verify(tamperedToken, SECRET)).toThrow();
  });

  it("throws on an expired token", () => {
    const token = jwt.sign({ uid: "u5", pid: "p5", role: "admin" }, SECRET, { expiresIn: -1 });
    expect(() => jwt.verify(token, SECRET)).toThrow(/jwt expired/i);
  });
});

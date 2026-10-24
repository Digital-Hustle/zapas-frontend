import { describe, expect, it } from "vitest";
import { ApiError } from "@zapas/api";
import { mapAuthFailure, mapChallenge, mapProfile, mapSessions } from "./mapper.ts";

const id = "00000000-0000-4000-8000-000000000001";
const time = "2026-10-24T10:00:00Z";
const profile = {
  id,
  email: "owner@example.test",
  displayName: null,
  version: 0,
  createdAt: time,
  updatedAt: time,
};

describe("Auth/Profile wire boundary", () => {
  it("keeps a null initial name and the server version without leaking wire metadata", () => {
    expect(mapProfile(profile)).toEqual({ id, email: profile.email, displayName: null, version: 0 });
    expect(() => mapProfile({ ...profile, version: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
    expect(() => mapProfile({ ...profile, displayName: " " })).toThrow();
  });
  it("uses absolute UTC deadlines and refuses a different OTP length", () => {
    const value = { challengeId: id, expiresAt: time, resendAvailableAt: time, codeLength: 6 as const };
    expect(mapChallenge(value)).toEqual({ id, expiresAt: Date.parse(time), resendAt: Date.parse(time) });
    expect(() => mapChallenge({ ...value, expiresAt: "not-a-date" })).toThrow();
  });
  it("preserves server session ordering and rejects an inconsistent total", () => {
    const value = {
      items: [{ id, current: true, createdAt: time, lastSeenAt: time, expiresAt: time }],
      total: 1,
    };
    expect(mapSessions(value)).toEqual(value.items);
    expect(() => mapSessions({ ...value, total: 2 })).toThrow();
  });
});

describe("safe HTTP errors", () => {
  const failure = (code: string, status = 401, retryable = true) =>
    new ApiError({ code, status, detail: "private-server-text" }, retryable);
  it("never treats an invalid login code as a lost browser session", () => {
    expect(mapAuthFailure(failure("CODE_INVALID")).kind).toBe("code-invalid");
    expect(mapAuthFailure(failure("CODE_EXPIRED")).kind).toBe("code-expired");
  });
  it("requires explicit recovery for an uncertain refresh and only expires a confirmed rejection", () => {
    expect(mapAuthFailure(failure("DEPENDENCY_UNAVAILABLE", 503, false)).kind).toBe("refresh-uncertain");
    expect(mapAuthFailure(failure("AUTHENTICATION_REQUIRED", 401, false)).kind).toBe("refresh-uncertain");
    expect(mapAuthFailure(failure("REFRESH_INVALID", 401, false)).kind).toBe("session-expired");
    expect(mapAuthFailure(failure("NETWORK", 0)).kind).toBe("offline");
  });
  it("uses Retry-After once as an absolute deadline and does not invent an attempts count", () => {
    const error = new ApiError({
      status: 429,
      code: "CODE_ATTEMPTS_EXCEEDED",
      detail: "private",
      retryAfterSec: 7,
    });
    expect(mapAuthFailure(error, 1000)).toMatchObject({ kind: "code-attempts-exceeded", retryAt: 8000 });
    expect(mapAuthFailure(error, 1000).message).not.toContain("7");
  });
  it("maps known fields to static text and hides unknown details and rejected values", () => {
    const issue = mapAuthFailure(
      new ApiError({
        status: 400,
        code: "VALIDATION_ERROR",
        detail: "private",
        errors: [
          { field: "displayName", code: "NotBlank", message: "private-name" },
          { field: "token", code: "invalid", message: "private-token" },
        ],
      }),
    );
    expect(issue.fields).toEqual({ displayName: "Имя: от 1 до 100 символов, не только пробелы" });
    expect(JSON.stringify(issue)).not.toContain("private");
    expect(mapAuthFailure(failure("NEW_SERVER_CODE", 500))).toMatchObject({ kind: "unknown" });
  });
});

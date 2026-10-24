import { expect, it } from "vitest";
import { emailSchema, otpSchema, profileSchema } from "./schemas.ts";

it("keeps leading zeros and only accepts six ASCII digits", () => {
  expect(otpSchema.parse("000123")).toBe("000123");
  for (const value of ["12345", "1234567", "１２３４５６", "1e0000", " 12345"]) {
    expect(otpSchema.safeParse(value).success).toBe(false);
  }
});

it("validates and trims email without changing the local-part case", () => {
  expect(emailSchema.parse(" Owner@example.test ")).toBe("Owner@example.test");
  expect(emailSchema.safeParse("invalid").success).toBe(false);
});

it("allows an explicit null name, rejects whitespace, and preserves the server version", () => {
  expect(profileSchema.parse({ displayName: null, version: 0 })).toEqual({ displayName: null, version: 0 });
  expect(profileSchema.safeParse({ displayName: "   ", version: 0 }).success).toBe(false);
  expect(profileSchema.parse({ displayName: "Владелец", version: 7 }).version).toBe(7);
});

it("counts display name Unicode characters and rejects unsafe versions", () => {
  expect(profileSchema.safeParse({ displayName: "🙂".repeat(100), version: 0 }).success).toBe(true);
  expect(profileSchema.safeParse({ displayName: "я".repeat(101), version: 0 }).success).toBe(false);
  for (const version of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    expect(profileSchema.safeParse({ displayName: "Имя", version }).success).toBe(false);
  }
});

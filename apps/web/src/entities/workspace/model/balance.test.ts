import { expect, it } from "vitest";
import { balanceAnchorSchema, mapBalanceAnchor } from "./balance.ts";

it("accepts signed exact NUMERIC(19,2) strings and zero without rounding", () => {
  for (const balance of ["0.00", "12.34", "-12.34", "99999999999999999.99", "-99999999999999999.99"]) {
    expect(
      balanceAnchorSchema.parse({ date: "2026-10-24", balance, reason: "Сверено с банком" }).balance,
    ).toBe(balance);
  }
});

it("rejects a balance anchor from another account or with an unknown provenance", () => {
  const accountId = "00000000-0000-4000-8000-000000000001";
  const anchor = {
    id: "00000000-0000-4000-8000-000000000002",
    accountId,
    date: "2026-10-24",
    balance: "-12.34",
    reason: "Сверено",
    source: "MANUAL",
    createdAt: "2026-10-24T09:00:00Z",
  };
  expect(mapBalanceAnchor(anchor, accountId).balance).toBe("-12.34");
  expect(() => mapBalanceAnchor(anchor, anchor.id)).toThrow();
  expect(() => mapBalanceAnchor({ ...anchor, source: "UNKNOWN" }, accountId)).toThrow();
});
it("requires a real calendar date, a reason and a complete supported decimal string", () => {
  for (const balance of ["", "1e5", "NaN", "100000000000000000.00", "12.345", "12"]) {
    expect(balanceAnchorSchema.safeParse({ date: "2026-10-24", balance, reason: "Сверено" }).success).toBe(
      false,
    );
  }
  expect(
    balanceAnchorSchema.safeParse({ date: "2026-02-30", balance: "0.00", reason: "Сверено" }).success,
  ).toBe(false);
  expect(balanceAnchorSchema.safeParse({ date: "2026-10-24", balance: "0.00", reason: " " }).success).toBe(
    false,
  );
});

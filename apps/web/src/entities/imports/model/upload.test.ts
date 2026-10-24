import { expect, it } from "vitest";
import { importDraftSchema, prepareImport, maxStatementSize } from "./upload.ts";
const accountId = "00000000-0000-4000-8000-000000000001";
const file = new File(["date,amount\n2026-10-24,12.34"], "example.csv", { type: "text/csv" });
const value = { file, validationMode: "ATOMIC", completeness: "UNKNOWN", fromDate: "", toDate: "" };
it("requires explicit complete dates and otherwise omits all declared dates", () => {
  expect(prepareImport(accountId, { ...value, fromDate: "2026-01-01", toDate: "2026-02-02" })).toEqual({
    file,
    accountId,
    validationMode: "ATOMIC",
    completeness: "UNKNOWN",
  });
  expect(importDraftSchema.safeParse({ ...value, completeness: "CONFIRMED_COMPLETE" }).success).toBe(false);
  expect(
    importDraftSchema.safeParse({
      ...value,
      completeness: "CONFIRMED_COMPLETE",
      fromDate: "2026-02-30",
      toDate: "2026-03-01",
    }).success,
  ).toBe(false);
  expect(
    importDraftSchema.safeParse({
      ...value,
      completeness: "CONFIRMED_COMPLETE",
      fromDate: "2026-03-02",
      toDate: "2026-03-01",
    }).success,
  ).toBe(false);
  expect(
    prepareImport(accountId, {
      ...value,
      completeness: "CONFIRMED_COMPLETE",
      validationMode: "SKIP_INVALID",
      fromDate: "2026-03-01",
      toDate: "2026-03-31",
    }),
  ).toEqual({
    file,
    accountId,
    validationMode: "SKIP_INVALID",
    completeness: "CONFIRMED_COMPLETE",
    declaredFromDate: "2026-03-01",
    declaredToDate: "2026-03-31",
  });
});
it("rejects missing, empty, non-CSV and oversized files without parsing statement rows", () => {
  for (const selected of [
    null,
    new File([], "empty.csv"),
    new File(["x"], "wrong.xlsx"),
    new File([new Uint8Array(maxStatementSize + 1)], "large.csv"),
  ])
    expect(importDraftSchema.safeParse({ ...value, file: selected }).success).toBe(false);
});

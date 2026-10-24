import { expect, it } from "vitest";
import { mapImport, mapImportIssue } from "./record.ts";
const companyId = "00000000-0000-4000-8000-000000000001";
const accountId = "00000000-0000-4000-8000-000000000002";
const record = {
  id: "00000000-0000-4000-8000-000000000003",
  companyId,
  accountId,
  status: "COMMITTED",
  fileName: "example.csv",
  fileSha256: "a".repeat(64),
  totalRows: 7,
  acceptedRows: 4,
  rejectedRows: 2,
  duplicateRows: 1,
  warningCount: 3,
  fromDate: null,
  toDate: null,
  createdAt: "2026-10-24T09:00:00Z",
  completedAt: null,
  dataVersion: null,
};
it("keeps reported counts and null dates without deriving financial or completeness results", () => {
  expect(mapImport(record, companyId, accountId)).toMatchObject({
    total: 7,
    accepted: 4,
    rejected: 2,
    duplicates: 1,
    warnings: 3,
    fromDate: null,
    toDate: null,
  });
  expect(mapImport({ ...record, status: "FUTURE_STATUS" }, companyId, accountId).status).toBe("UNKNOWN");
  expect(
    mapImport({ ...record, fileName: "📄".repeat(196) + ".csv" }, companyId, accountId).fileName,
  ).toHaveLength(396);
});
it("rejects a report from another company/account and unsafe row counts", () => {
  expect(() => mapImport(record, accountId, accountId)).toThrow();
  expect(() => mapImport(record, companyId, companyId)).toThrow();
  expect(() =>
    mapImport({ ...record, totalRows: Number.MAX_SAFE_INTEGER + 1 }, companyId, accountId),
  ).toThrow();
});
it("preserves plain issue text and handles unknown severity without inventing a level", () => {
  expect(
    mapImportIssue({
      id: record.id,
      severity: "FUTURE",
      code: "UNKNOWN_CATEGORY",
      rowNumber: null,
      field: null,
      message: "<b>Текст сервера</b>",
    }),
  ).toMatchObject({ severity: "UNKNOWN", rowNumber: null, message: "<b>Текст сервера</b>" });
});

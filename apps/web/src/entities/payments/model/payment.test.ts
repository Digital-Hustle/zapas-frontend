import { expect, it } from "vitest";
import { mapPayment, mapCategory, preparePaymentFilters } from "./payment.ts";
const companyId = "00000000-0000-4000-8000-000000000001";
const accountId = "00000000-0000-4000-8000-000000000002";
const row = {
  id: "00000000-0000-4000-8000-000000000003",
  companyId,
  accountId,
  importId: "00000000-0000-4000-8000-000000000004",
  externalOperationId: null,
  operationDate: "2026-10-24",
  amount: "99999999999999999.99",
  direction: "OUT",
  counterpartyInn: "0012345678",
  counterpartyName: null,
  purpose: null,
  categoryCode: "OTHER",
  categorySource: "OTHER",
  ruleVersion: null,
  balanceEod: "-99999999999999999.99",
  allocatedAmount: "0.00",
  version: 7,
  createdAt: "2026-10-24T09:00:00Z",
};
it("preserves exact operation amounts, zero allocated money and a negative EOD without financial calculations", () => {
  expect(mapPayment(row, companyId, accountId)).toMatchObject({
    amount: "99999999999999999.99",
    balanceEod: "-99999999999999999.99",
    allocatedAmount: "0.00",
    version: 7,
    counterpartyInn: "0012345678",
  });
  expect(mapPayment({ ...row, balanceEod: null }, companyId, accountId).balanceEod).toBeNull();
});
it("rejects wrong scope, nonpositive/unsupported amounts and unsafe resource versions", () => {
  expect(() => mapPayment(row, accountId, accountId)).toThrow();
  expect(() => mapPayment(row, companyId, companyId)).toThrow();
  for (const amount of ["0.00", "-1.00", "1e5", "100000000000000000.00", "12.345"])
    expect(() => mapPayment({ ...row, amount }, companyId, accountId)).toThrow();
  expect(() => mapPayment({ ...row, version: Number.MAX_SAFE_INTEGER + 1 }, companyId, accountId)).toThrow();
});
it("handles future directions/sources without relabelling them as known facts", () => {
  expect(
    mapPayment({ ...row, direction: "FUTURE", categorySource: "FUTURE" }, companyId, accountId),
  ).toMatchObject({ direction: "UNKNOWN", categorySource: "UNKNOWN" });
  expect(
    mapCategory({ code: "OTHER", name: "Прочее", directions: ["IN", "OUT"], system: true }).directions,
  ).toEqual(["IN", "OUT"]);
});
it("prepares only server filters and rejects incomplete/reversed date ranges", () => {
  const value = {
    fromDate: "",
    toDate: "",
    direction: "ALL",
    categoryCode: "",
    counterpartyKey: "",
    q: "  ",
    sort: "operationDate,desc",
  };
  expect(preparePaymentFilters(value)).toEqual({ sort: "operationDate,desc" });
  expect(
    preparePaymentFilters({
      ...value,
      fromDate: "2026-10-01",
      toDate: "2026-10-24",
      direction: "OUT",
      categoryCode: "OTHER",
      counterpartyKey: "inn:0012345678",
      q: "Аренда",
    }),
  ).toEqual({
    fromDate: "2026-10-01",
    toDate: "2026-10-24",
    direction: "OUT",
    categoryCode: "OTHER",
    counterpartyKey: "inn:0012345678",
    q: "Аренда",
    sort: "operationDate,desc",
  });
  expect(() => preparePaymentFilters({ ...value, fromDate: "2026-10-01" })).toThrow();
  expect(() => preparePaymentFilters({ ...value, fromDate: "2026-10-24", toDate: "2026-10-01" })).toThrow();
});

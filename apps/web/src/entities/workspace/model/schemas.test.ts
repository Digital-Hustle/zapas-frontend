import { expect, it } from "vitest";
import { accountDraftSchema, companyDraftSchema, mapAccount, mapCompany } from "./schemas.ts";

it("preserves leading zeroes in company and account identifiers and sends explicit nullable fields", () => {
  expect(
    companyDraftSchema.parse({ name: "Компания", legalForm: "OOO", inn: "0012345678", kpp: "001234567" }).inn,
  ).toBe("0012345678");
  expect(
    accountDraftSchema.parse({
      name: "Счёт",
      bankName: "",
      accountNumber: "00000000000000000001",
      externalCompanyId: "",
    }).accountNumber,
  ).toBe("00000000000000000001");
  expect(companyDraftSchema.safeParse({ name: " ", legalForm: "OOO", inn: "", kpp: "" }).success).toBe(false);
  expect(
    accountDraftSchema.safeParse({ name: "Счёт", bankName: "", accountNumber: "123", externalCompanyId: "" })
      .success,
  ).toBe(false);
});
it("keeps signed exact balances and null without client totals, and checks the account scope", () => {
  const companyId = "00000000-0000-4000-8000-000000000001";
  const value = {
    id: "00000000-0000-4000-8000-000000000002",
    companyId,
    name: "Основной",
    bankName: null,
    accountNumber: null,
    externalCompanyId: null,
    currency: "RUB",
    archived: false,
    latestBalance: "-99999999999999999.99",
    latestBalanceDate: "2026-10-24",
    version: 1,
  };
  expect(mapAccount(value, companyId).balance).toBe(value.latestBalance);
  expect(
    mapAccount({ ...value, latestBalance: null, latestBalanceDate: null }, companyId).balance,
  ).toBeNull();
  expect(() => mapAccount(value, "00000000-0000-4000-8000-000000000003")).toThrow();
});
it("denies writes on an unknown role instead of promoting it to an owner", () => {
  const value = {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Компания",
    legalForm: "OTHER",
    inn: null,
    kpp: null,
    timezone: "Europe/Moscow",
    ownerUserId: "00000000-0000-4000-8000-000000000010",
    myRole: "FUTURE_ROLE",
    permissions: {
      canEditCompany: false,
      canManageMembers: false,
      canImport: false,
      canEditPayments: false,
      canManagePlans: false,
      canRunForecast: false,
      canRunBacktest: false,
    },
    archived: false,
    version: 1,
    dataVersion: 0,
    createdAt: "2026-10-24T09:00:00Z",
    updatedAt: "2026-10-24T09:00:00Z",
  };
  expect(mapCompany(value).role).toBe("UNKNOWN");
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as Orchestrator from "@zapas/api/orchestrator";
import type { RecurringDraft } from "../model/model.ts";
const sdk = vi.hoisted(() => ({ updateRecurring: vi.fn(), updateMember: vi.fn(), createForecast: vi.fn() }));
vi.mock("@zapas/api/orchestrator", async (original) => ({
  ...(await original<typeof Orchestrator>()),
  ...sdk,
}));
import { cashflowApi } from "./adapter.ts";
const company = "00000000-0000-4000-8000-000000000001";
const account = "00000000-0000-4000-8000-000000000003";
const id = "00000000-0000-4000-8000-000000000004";
const other = "00000000-0000-4000-8000-000000000005";
const draft: RecurringDraft = {
  status: "CONFIRMED",
  amount: "99999999999999999.99",
  schedule: { frequency: "MONTHLY", weekday: null, dayOfMonth: 31, businessDayRule: "FOLLOWING" },
};
const rule = {
  ...draft,
  id,
  accountId: account,
  direction: "OUT",
  categoryCode: "RENT",
  counterpartyKey: null,
  observations: 4,
  firstSeen: "2026-01-01",
  lastSeen: "2026-02-01",
  inputDataVersion: 1,
  detectorVersion: "v1",
  version: 8,
};
beforeEach(() => vi.resetAllMocks());
describe("cashflow command boundaries", () => {
  it("passes the exact money and quoted version through the public SDK", async () => {
    sdk.updateRecurring.mockResolvedValue(rule);
    expect((await cashflowApi.updateRecurring(company, account, id, draft, 7)).amount).toBe(draft.amount);
    expect(sdk.updateRecurring).toHaveBeenCalledWith(
      company,
      id,
      draft,
      { "If-Match": '"7"' },
      { silent: true },
    );
  });
  it("rejects a recurring response for a different resource even inside the same account", async () => {
    sdk.updateRecurring.mockResolvedValue({ ...rule, id: other });
    await expect(cashflowApi.updateRecurring(company, account, id, draft, 7)).rejects.toThrow();
  });
  it("does not accept a member update for a different user", async () => {
    sdk.updateMember.mockResolvedValue({
      userId: other,
      role: "VIEWER",
      joinedAt: "2026-10-24T09:00:00Z",
      version: 2,
    });
    await expect(cashflowApi.updateMember(company, id, "VIEWER", 1)).rejects.toThrow();
  });
  it("refuses a job response of a different calculation type", async () => {
    sdk.createForecast.mockResolvedValue({
      id,
      companyId: company,
      accountId: account,
      type: "BACKTEST",
      status: "QUEUED",
      progress: 0,
      resultId: null,
      error: null,
      createdAt: "2026-10-24T09:00:00Z",
    });
    await expect(
      cashflowApi.startForecast(company, account, { asOfDate: "2026-01-01", scope: "HISTORY_ONLY" }, other),
    ).rejects.toThrow();
  });
  it("does not send a request with an invalid version or UUID", async () => {
    await expect(cashflowApi.updateRecurring(company, account, id, draft, 0)).rejects.toThrow();
    await expect(cashflowApi.updateRecurring("bad", account, id, draft, 1)).rejects.toThrow();
    expect(sdk.updateRecurring).not.toHaveBeenCalled();
  });
});

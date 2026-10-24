import { type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ForecastRs, BacktestRs } from "@zapas/api/orchestrator";

const forecastFixture = JSON.parse(
  readFileSync(
    new URL("../../../../contracts/examples/orchestrator/examples/getForecast.json", import.meta.url),
    "utf8",
  ),
) as ForecastRs;
const backtestFixture = JSON.parse(
  readFileSync(
    new URL("../../../../contracts/examples/orchestrator/examples/getBacktest.json", import.meta.url),
    "utf8",
  ),
) as BacktestRs;

export const companyId = "00000000-0000-4000-8000-000000000001";
export const accountId = "00000000-0000-4000-8000-000000000003";
export const other = "00000000-0000-4000-8000-000000000004";
export const time = "2026-10-24T09:00:00Z";
export const base = `/api/v1/orchestrator/companies/${companyId}`;
export const url = (section: string) => `/app/${section}?company=${companyId}&account=${accountId}`;

export async function service(page: Page, role = "OWNER") {
  const state = {
    requests: [] as { path: string; method: string; body: unknown; headers: Record<string, string> }[],
    planVersion: 1,
    recurringConflict: false,
    recurringValidation: false,
    recurringLost: false,
    recurringStatus: 200,
    detectLost: false,
    detectCalls: 0,
    detectRetry: false,
    failedJob: false,
    jobReads: 0,
    conflict: false,
    failDashboard: false,
  };
  const permissions = {
    canEditCompany: role === "OWNER",
    canManageMembers: role === "OWNER",
    canImport: role !== "VIEWER",
    canEditPayments: role !== "VIEWER",
    canManagePlans: role !== "VIEWER",
    canRunForecast: role !== "VIEWER",
    canRunBacktest: role !== "VIEWER",
  };
  const forecast = { ...forecastFixture, companyId, accountId };
  const quality = { ...backtestFixture, companyId, accountId };
  const settings = { accountId, forecast: forecast.settings, autoRecalculate: true, version: 1 };
  const recurring = {
    id: other,
    accountId,
    direction: "OUT",
    categoryCode: "RENT",
    counterpartyKey: null,
    status: "DETECTED",
    schedule: { frequency: "MONTHLY", weekday: null, dayOfMonth: 1, businessDayRule: "FOLLOWING" },
    amount: "42000.00",
    observations: 4,
    firstSeen: "2026-06-01",
    lastSeen: "2026-09-01",
    inputDataVersion: 1,
    detectorVersion: "v1",
    version: 1,
  };
  const plans: Record<string, unknown>[] = [];
  const alert = {
    id: other,
    companyId,
    accountId,
    type: "CASH_GAP",
    title: "Ожидается нехватка денег",
    description: "Проверьте предстоящие платежи",
    forecastId: forecast.id,
    gapId: forecast.gaps[0]?.id ?? null,
    expectedPaymentId: null,
    date: "2026-10-29",
    shortfall: "50000.00",
    probability: null,
    active: true,
    acknowledgedAt: null as string | null,
    version: 1,
    createdAt: time,
  };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const body = request.postData() ? (request.postDataJSON() as Record<string, unknown>) : {};
    const headers = request.headers();
    state.requests.push({ path, method, body, headers });
    const json = (value: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });
    const problem = (status: number, code: string) =>
      json(
        {
          status,
          code,
          type: "about:blank",
          title: "Ошибка",
          detail: "private-financial-body",
          traceId: "trace",
          errors: [],
          retryAfterSec: null,
          resourceId: null,
        },
        status,
      );
    const paged = (items: unknown[]) =>
      json({ items, page: { page: 0, size: 20, total: items.length, hasNext: false } });
    if (path.endsWith("/auth/csrf")) return json({ token: "test-csrf", headerName: "X-CSRF-Token" });
    if (path.endsWith("/profile/me"))
      return json({
        id: other,
        email: "owner@example.test",
        displayName: null,
        version: 0,
        createdAt: time,
        updatedAt: time,
      });
    if (path === base)
      return json({
        id: companyId,
        name: "Мой бизнес",
        legalForm: "OOO",
        inn: null,
        kpp: null,
        timezone: "Europe/Moscow",
        ownerUserId: other,
        myRole: role,
        permissions,
        archived: false,
        version: 1,
      });
    if (path === `${base}/accounts/${accountId}`)
      return json({
        id: accountId,
        companyId,
        name: "Основной счёт",
        bankName: null,
        accountNumber: null,
        externalCompanyId: null,
        currency: "RUB",
        archived: false,
        latestBalance: "100000.00",
        latestBalanceDate: "2026-10-24",
        version: 1,
      });
    if (path.endsWith("/dashboard"))
      return state.failDashboard
        ? problem(503, "DEPENDENCY_UNAVAILABLE")
        : json({
            companyId,
            accountId,
            asOfDate: "2026-10-24",
            dataVersion: 1,
            currentBalance: {
              id: other,
              accountId,
              date: "2026-10-24",
              balance: "100000.00",
              source: "STATEMENT",
              reason: null,
            },
            latestForecast: forecast,
            latestBacktest: null,
            activeAlerts: [alert],
            upcomingPayments: plans,
            runningJobs: [],
            permissions,
            quality: {
              accountId,
              fromDate: "2026-01-01",
              toDate: "2026-10-24",
              quality: "LIMITED",
              completeDayCount: 100,
              missingDayCount: 2,
              balanceMismatchCount: 0,
              emptyPurposeCount: 0,
              warnings: [],
            },
          });
    if (path.endsWith("/daily-actuals"))
      return json({ items: [{ date: "2026-10-24", balanceEod: "100000.00", status: "OBSERVED" }] });
    if (path.endsWith("/categories"))
      return json({ items: [{ code: "RENT", name: "Аренда", directions: ["OUT"], system: true }] });
    if (path.endsWith("/counterparties")) return paged([]);
    if (path.endsWith("/recurring-patterns") && method === "GET")
      return state.recurringStatus !== 200
        ? problem(state.recurringStatus, "UNAVAILABLE")
        : paged([recurring]);
    const job = {
      id: other,
      companyId,
      accountId,
      type: "DETECT_RECURRING",
      status: "QUEUED",
      progress: 0,
      resultId: null,
      error: null,
      createdAt: time,
    };
    if (path.endsWith("/recurring-detection-jobs")) {
      state.detectCalls++;
      if (state.detectLost) {
        state.detectLost = false;
        return route.abort("failed");
      }
      if (state.detectRetry) {
        state.detectRetry = false;
        return route.fulfill({
          status: 429,
          headers: { "Content-Type": "application/problem+json", "Retry-After": "1" },
          body: JSON.stringify({ status: 429, code: "RATE_LIMITED", title: "Rate", retryAfterSec: 1 }),
        });
      }
      return json(job, 202);
    }
    if (path.endsWith(`/jobs/${other}`) && method === "GET") {
      state.jobReads++;
      return json({
        ...job,
        status: state.jobReads > 2 ? (state.failedJob ? "FAILED" : "SUCCEEDED") : "RUNNING",
        error: state.failedJob
          ? { code: "INSUFFICIENT_HISTORY", traceId: "trace", detail: "private-financial-body" }
          : null,
        progress: state.jobReads > 2 ? 100 : 40,
      });
    }
    if (path.endsWith(`/recurring-patterns/${other}`) && method === "PUT") {
      if (state.recurringValidation)
        return json(
          {
            status: 422,
            code: "VALIDATION_FAILED",
            title: "Invalid",
            errors: [{ field: "amount", message: "private-financial-body" }],
          },
          422,
        );
      if (state.recurringConflict) {
        state.recurringConflict = false;
        recurring.version++;
        return problem(409, "VERSION_CONFLICT");
      }
      Object.assign(recurring, body, { version: recurring.version + 1 });
      if (state.recurringLost) {
        state.recurringLost = false;
        return route.abort("failed");
      }
      return json(recurring);
    }
    if (path.endsWith("/expected-payments") && method === "GET") return paged(plans);
    if (path.endsWith("/expected-payments") && method === "POST") {
      const value = {
        ...body,
        id: other,
        companyId,
        accountId,
        source: "MANUAL",
        sourceDocument: null,
        status: "OPEN",
        settledAmount: "0.00",
        remainingAmount: body.amount,
        overdue: false,
        knownAt: time,
        createdAt: time,
        updatedAt: time,
        version: state.planVersion,
      };
      plans.push(value);
      return json(value, 201);
    }
    if (path.endsWith(`/expected-payments/${other}`) && method === "GET")
      return json({ ...plans[0], version: state.planVersion });
    if (path.endsWith(`/expected-payments/${other}`) && method === "PUT") {
      if (state.conflict) {
        state.conflict = false;
        state.planVersion += 1;
        return problem(409, "VERSION_CONFLICT");
      }
      const plan = plans[0];
      if (!plan) return problem(404, "NOT_FOUND");
      Object.assign(plan, body, { version: ++state.planVersion });
      return json(plan);
    }
    if (path.endsWith("/allocations")) return paged([]);
    if (path.endsWith("/payments")) return paged([]);
    if (path.endsWith("/settings") && method === "GET") return json(settings);
    if (path.endsWith("/settings") && method === "PUT") {
      Object.assign(settings, body, { version: settings.version + 1 });
      return json(settings);
    }
    if (path.endsWith("/alerts") && method === "GET") return paged([alert]);
    if (path.endsWith("/acknowledge")) {
      alert.acknowledgedAt = time;
      alert.version += 1;
      return json(alert);
    }
    if (path.endsWith("/backtests") && method === "GET") return paged([quality]);
    if (path.endsWith(`/backtests/${quality.id}`)) return json(quality);
    if (path.endsWith("/origins")) return paged([]);
    if (path.endsWith("/members"))
      return paged([{ userId: other, role: "OWNER", joinedAt: time, version: 1 }]);
    if (path.endsWith("/data-quality"))
      return json({
        accountId,
        fromDate: null,
        toDate: null,
        quality: "LIMITED",
        completeDayCount: 100,
        missingDayCount: 2,
        balanceMismatchCount: 0,
        emptyPurposeCount: 0,
        warnings: [],
      });
    if (path.endsWith("/completeness-ranges")) return paged([]);
    if (path.includes("/forecasts/") && path.includes("/gaps/"))
      return json({ forecastId: forecast.id, gap: forecast.gaps[0], factors: [], recommendations: [] });
    if (path.endsWith(`/forecasts/${forecast.id}`)) return json(forecast);
    if (path.endsWith("/jobs")) return paged([]);
    return problem(404, "NOT_FOUND");
  });
  return Object.assign(state, { recurring });
}

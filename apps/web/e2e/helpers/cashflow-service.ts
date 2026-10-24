import { type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ForecastRs, BacktestRs, JobRs } from "@zapas/api/orchestrator";

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

export function samplePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: other,
    companyId,
    accountId,
    title: "Аренда",
    direction: "OUT",
    amount: "150.00",
    dueDate: "2026-10-01",
    categoryCode: "RENT",
    counterpartyKey: null,
    note: null,
    relation: "ADDITIONAL",
    recurringPatternId: null,
    baselineCounterpartyKey: null,
    source: "MANUAL",
    sourceDocument: null,
    status: "OPEN",
    settledAmount: "0.00",
    remainingAmount: "150.00",
    overdue: true,
    version: 1,
    knownAt: time,
    createdAt: time,
    updatedAt: time,
    ...overrides,
  };
}
export function samplePayment() {
  return {
    id: other,
    companyId,
    accountId,
    importId: other,
    externalOperationId: null,
    operationDate: "2026-10-24",
    amount: "1000.00",
    direction: "OUT",
    counterpartyInn: null,
    counterpartyName: "Арендодатель",
    purpose: "Оплата аренды",
    categoryCode: "RENT",
    categorySource: "USER",
    ruleVersion: null,
    balanceEod: null,
    allocatedAmount: "0.00",
    version: 1,
    createdAt: time,
  };
}

export function sampleJob(overrides: Record<string, unknown> = {}) {
  return {
    id: other,
    companyId,
    accountId,
    type: "FORECAST",
    status: "SUCCEEDED",
    progress: 100,
    resultId: forecastFixture.id,
    error: null,
    createdAt: time,
    ...overrides,
  };
}
export async function service(page: Page, role = "OWNER") {
  const state = {
    requests: [] as { path: string; method: string; body: unknown; headers: Record<string, string> }[],
    planVersion: 1,
    settingsStatus: 200,
    settingsConflict: false,
    settingsLost: false,
    membersStatus: 200,
    memberConflict: false,
    memberLost: false,
    completenessLost: false,
    alertsStatus: 200,
    alertsPaged: false,
    alertConflict: false,
    alertLost: false,
    jobsStatus: 200,
    jobsPaged: false,
    savedJobs: [] as Record<string, unknown>[],
    plansStatus: 200,
    planLost: false,
    allocationConflict: false,
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
    dashboardStatus: 200,
    emptyDashboard: false,
    forecastLost: false,
    backtestLost: false,
    backtestsStatus: 200,
    backtestStatus: 200,
    emptyBacktests: false,
    originsPaged: false,
    newBacktest: null as BacktestRs | null,
    backtestCompleted: false,
    jobType: "DETECT_RECURRING" as JobRs["type"],
    newForecast: null as ForecastRs | null,
    forecastCompleted: false,
    cancelled: false,
    holdQueued: false,
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
  const forecast = { ...structuredClone(forecastFixture), companyId, accountId };
  const quality = { ...structuredClone(backtestFixture), companyId, accountId };
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
  const members = [{ userId: other, role: "OWNER", joinedAt: time, version: 1 }];
  const completeness: Record<string, unknown>[] = [];
  const settingsReplies = new Map<string, unknown>();
  const plans: Record<string, unknown>[] = [];
  const payments: Record<string, unknown>[] = [];
  const allocations: Record<string, unknown>[] = [];
  const planReplies = new Map<string, Record<string, unknown>>();
  const alert = {
    id: other,
    companyId,
    accountId,
    type: "CASH_GAP",
    title: "Ожидается нехватка денег",
    description: "Проверьте предстоящие платежи",
    forecastId: forecast.id,
    gapId: forecast.gaps[0]?.id ?? null,
    expectedPaymentId: null as string | null,
    date: "2026-10-29",
    shortfall: "50000.00",
    probability: null as number | null,
    active: true,
    acknowledgedAt: null as string | null,
    version: 1,
    createdAt: time,
  };
  const alerts = [alert];
  const alertReplies = new Map<string, typeof alert>();
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
      return state.failDashboard || state.dashboardStatus !== 200
        ? problem(state.dashboardStatus !== 200 ? state.dashboardStatus : 503, "DEPENDENCY_UNAVAILABLE")
        : json({
            companyId,
            accountId,
            asOfDate: "2026-10-24",
            dataVersion: 1,
            currentBalance: state.emptyDashboard
              ? null
              : {
                  id: other,
                  accountId,
                  date: "2026-10-24",
                  balance: "100000.00",
                  source: "STATEMENT",
                  reason: null,
                },
            latestForecast: state.emptyDashboard
              ? null
              : state.forecastCompleted
                ? state.newForecast
                : forecast,
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
    if (path.endsWith("/counterparties"))
      return paged([
        {
          key: "inn:123",
          inn: "1234567890",
          name: "Арендодатель",
          paymentCount: 4,
          lastOperationDate: "2026-10-24",
        },
      ]);
    if (path.endsWith("/recurring-patterns") && method === "GET")
      return state.recurringStatus !== 200
        ? problem(state.recurringStatus, "UNAVAILABLE")
        : paged([recurring]);
    const job = {
      id: other,
      companyId,
      accountId,
      type: state.jobType,
      status: "QUEUED",
      progress: 0,
      resultId: null,
      error: null,
      createdAt: time,
    };
    if (path.endsWith("/backtest-jobs")) {
      state.jobType = "BACKTEST";
      state.newBacktest = { ...quality, id: "00000000-0000-4000-8000-000000000009", jobId: other };
      if (state.backtestLost) {
        state.backtestLost = false;
        return route.abort("failed");
      }
      return json({ ...job, type: "BACKTEST" }, 202);
    }
    if (path.endsWith("/forecast-jobs")) {
      state.jobType = "FORECAST";
      state.newForecast = { ...forecast, id: "00000000-0000-4000-8000-000000000008", jobId: other };
      if (state.forecastLost) {
        state.forecastLost = false;
        return route.abort("failed");
      }
      return json({ ...job, type: "FORECAST" }, 202);
    }
    if (path.endsWith(`/jobs/${other}/cancel`)) {
      state.cancelled = true;
      return json({ ...job, status: "CANCELLED" });
    }
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
    if (path.includes("/jobs/") && method === "GET") {
      const saved = state.savedJobs.find((row) => path.endsWith(`/${String(row.id)}`));
      if (saved) return json(saved);
    }
    if (path.endsWith(`/jobs/${other}`) && method === "GET") {
      state.jobReads++;
      if (state.jobReads > 2 && !state.failedJob && state.jobType === "BACKTEST")
        state.backtestCompleted = true;
      if (state.jobReads > 2 && !state.failedJob && state.jobType === "FORECAST")
        state.forecastCompleted = true;
      return json({
        ...job,
        status: state.cancelled
          ? "CANCELLED"
          : state.holdQueued
            ? "QUEUED"
            : state.jobReads > 2
              ? state.failedJob
                ? "FAILED"
                : "SUCCEEDED"
              : "RUNNING",
        resultId:
          state.jobReads > 2 && !state.failedJob
            ? state.jobType === "FORECAST"
              ? (state.newForecast?.id ?? null)
              : state.jobType === "BACKTEST"
                ? (state.newBacktest?.id ?? null)
                : null
            : null,
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
    if (path.endsWith("/expected-payments") && method === "GET") {
      if (state.plansStatus !== 200) return problem(state.plansStatus, "UNAVAILABLE");
      const status = new URL(request.url()).searchParams.get("status");
      return paged(status ? plans.filter((row) => row.status === status) : plans);
    }
    if (path.endsWith("/expected-payments") && method === "POST") {
      const replay = planReplies.get(headers["idempotency-key"] ?? "");
      if (replay) return json(replay, 201);
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
      planReplies.set(headers["idempotency-key"] ?? "", value);
      if (state.planLost) {
        state.planLost = false;
        return route.abort("failed");
      }
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
    if (path.endsWith("/allocations") && method === "GET") return paged(allocations);
    if (path.endsWith("/allocations") && method === "POST") {
      if (state.allocationConflict) {
        state.allocationConflict = false;
        state.planVersion++;
        return problem(409, "VERSION_CONFLICT");
      }
      const row = {
        id: other,
        expectedPaymentId: other,
        paymentId: body.paymentId,
        amount: body.amount,
        createdAt: time,
      };
      allocations.push(row);
      state.planVersion++;
      Object.assign(plans[0] ?? {}, {
        settledAmount: "50.00",
        remainingAmount: "75.00",
        status: "PARTIALLY_SETTLED",
        version: state.planVersion,
      });
      return json(row, 201);
    }
    if (path.endsWith(`/allocations/${other}`) && method === "DELETE") {
      allocations.length = 0;
      state.planVersion++;
      Object.assign(plans[0] ?? {}, {
        settledAmount: "0.00",
        remainingAmount: "150.00",
        status: "OPEN",
        version: state.planVersion,
      });
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith(`/expected-payments/${other}/cancel`)) {
      state.planVersion++;
      Object.assign(plans[0] ?? {}, {
        status: "CANCELLED",
        remainingAmount: "0.00",
        version: state.planVersion,
      });
      return json(plans[0]);
    }
    if (path.endsWith("/expected-payment-imports")) {
      const items = (body.items ?? []) as Record<string, unknown>[];
      const rows = items.map((item) =>
        samplePlan({ ...item, source: item.source, sourceDocument: item.sourceDocument }),
      );
      plans.push(...rows);
      return json({ createdCount: rows.length, updatedCount: 0, unchangedCount: 0, items: rows });
    }
    if (path.endsWith("/payments")) return paged(payments);
    if (path.endsWith("/settings") && method === "GET")
      return state.settingsStatus === 200 ? json(settings) : problem(state.settingsStatus, "UNAVAILABLE");
    if (path.endsWith("/settings") && method === "PUT") {
      if (state.settingsConflict) {
        state.settingsConflict = false;
        settings.version++;
        return problem(409, "VERSION_CONFLICT");
      }
      Object.assign(settings, body, { version: settings.version + 1 });
      if (state.settingsLost) {
        state.settingsLost = false;
        return route.abort("failed");
      }
      return json(settings);
    }
    if (path.endsWith("/alerts") && method === "GET") {
      if (state.alertsStatus !== 200) return problem(state.alertsStatus, "UNAVAILABLE");
      const params = new URL(request.url()).searchParams;
      const filtered = alerts.filter(
        (item) => !params.has("active") || String(item.active) === params.get("active"),
      );
      if (!state.alertsPaged) return paged(filtered);
      const number = Number(params.get("page") ?? 0);
      return json({
        items: filtered.slice(number, number + 1),
        page: { page: number, size: 1, total: filtered.length, hasNext: number + 1 < filtered.length },
      });
    }
    if (path.endsWith("/acknowledge")) {
      const replay = alertReplies.get(headers["idempotency-key"] ?? "");
      if (replay) return json(replay);
      if (state.alertConflict) {
        state.alertConflict = false;
        alert.version += 1;
        return problem(409, "VERSION_CONFLICT");
      }
      alert.acknowledgedAt = time;
      alert.version += 1;
      alertReplies.set(headers["idempotency-key"] ?? "", { ...alert });
      if (state.alertLost) {
        state.alertLost = false;
        return route.abort("failed");
      }
      return json(alert);
    }
    if (path.endsWith("/backtests") && method === "GET")
      return state.backtestsStatus !== 200
        ? problem(state.backtestsStatus, "UNAVAILABLE")
        : paged(
            state.emptyBacktests
              ? []
              : state.backtestCompleted && state.newBacktest
                ? [state.newBacktest, quality]
                : [quality],
          );
    if (path.endsWith(`/backtests/${quality.id}`))
      return state.backtestStatus !== 200 ? problem(state.backtestStatus, "UNAVAILABLE") : json(quality);
    if (state.newBacktest && path.endsWith(`/backtests/${state.newBacktest.id}`))
      return json(state.newBacktest);
    if (path.endsWith("/origins")) {
      if (!state.originsPaged) return paged([]);
      const number = Number(new URL(request.url()).searchParams.get("page") ?? 0);
      const rows = [
        {
          asOfDate: "2026-06-01",
          status: "EVALUATED",
          reason: null,
          evaluatedDays: 30,
          maeBalance: "8000.50",
        },
        {
          asOfDate: "2026-06-08",
          status: "SKIPPED",
          reason: "Неполная история",
          evaluatedDays: 0,
          maeBalance: null,
        },
      ];
      return json({
        items: rows.slice(number, number + 1),
        page: { page: number, size: 1, total: 2, hasNext: number === 0 },
      });
    }
    if (path.endsWith("/members") && method === "GET")
      return state.membersStatus === 200 ? paged(members) : problem(state.membersStatus, "UNAVAILABLE");
    if (path.endsWith("/members") && method === "POST") {
      const key = headers["idempotency-key"] ?? "";
      if (settingsReplies.has(key)) return json(settingsReplies.get(key), 201);
      const member = { userId: String(body.userId), role: String(body.role), joinedAt: time, version: 1 };
      members.push(member);
      settingsReplies.set(key, member);
      if (state.memberLost) {
        state.memberLost = false;
        return route.abort("failed");
      }
      return json(member, 201);
    }
    if (path.includes("/members/") && ["PATCH", "PUT", "DELETE"].includes(method)) {
      const member = members.find((item) => path.endsWith(`/members/${item.userId}`));
      if (!member) return problem(404, "NOT_FOUND");
      if (state.memberConflict) {
        state.memberConflict = false;
        member.version++;
        return problem(409, "VERSION_CONFLICT");
      }
      if (method === "DELETE") {
        members.splice(members.indexOf(member), 1);
        return route.fulfill({ status: 204 });
      }
      Object.assign(member, body, { version: member.version + 1 });
      return json(member);
    }
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
    if (path.endsWith("/completeness-ranges") && method === "GET") return paged(completeness);
    if (path.endsWith("/completeness-ranges") && method === "POST") {
      const key = headers["idempotency-key"] ?? "";
      if (settingsReplies.has(key)) return json(settingsReplies.get(key), 201);
      const value = { ...body, id: other, accountId, createdAt: time };
      completeness.push(value);
      settingsReplies.set(key, value);
      if (state.completenessLost) {
        state.completenessLost = false;
        return route.abort("failed");
      }
      return json(value, 201);
    }
    if (path.includes("/forecasts/") && path.includes("/gaps/"))
      return json({ forecastId: forecast.id, gap: forecast.gaps[0], factors: [], recommendations: [] });
    if (path.endsWith(`/forecasts/${forecast.id}`)) return json(forecast);
    if (state.newForecast && path.endsWith(`/forecasts/${state.newForecast.id}`))
      return json(state.newForecast);
    if (path.endsWith("/jobs")) {
      if (state.jobsStatus !== 200) return problem(state.jobsStatus, "UNAVAILABLE");
      if (!state.jobsPaged) return paged(state.savedJobs);
      const number = Number(new URL(request.url()).searchParams.get("page") ?? 0);
      return json({
        items: state.savedJobs.slice(number, number + 1),
        page: {
          page: number,
          size: 1,
          total: state.savedJobs.length,
          hasNext: number + 1 < state.savedJobs.length,
        },
      });
    }
    return problem(404, "NOT_FOUND");
  });
  return Object.assign(state, {
    recurring,
    plans,
    payments,
    allocations,
    forecast,
    quality,
    alert,
    alerts,
    settings,
    members,
    completeness,
  });
}

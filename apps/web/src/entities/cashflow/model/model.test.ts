import { describe, expect, it } from "vitest";
import type { ForecastRs } from "@zapas/api/orchestrator";
import { readFileSync } from "node:fs";
import {
  planDraftSchema,
  recurringDraftSchema,
  settingsDraftSchema,
  mapPlan,
  mapJob,
  mapForecast,
  mapQuality,
  mapActual,
  mapRecurring,
} from "./model.ts";

const companyId = "00000000-0000-4000-8000-000000000001";
const accountId = "00000000-0000-4000-8000-000000000003";
const id = "00000000-0000-4000-8000-000000000004";
const time = "2026-10-24T09:00:00Z";
const draft = {
  title: "Аренда",
  direction: "OUT",
  amount: "99999999999999999.99",
  dueDate: "2026-11-01",
  categoryCode: "RENT",
  counterpartyKey: null,
  note: null,
  relation: "ADDITIONAL",
  recurringPatternId: null,
  baselineCounterpartyKey: null,
};

describe("cashflow domain validation", () => {
  it("preserves exact plan money and refuses zero or a replacement without its target", () => {
    expect(planDraftSchema.parse(draft).amount).toBe("99999999999999999.99");
    expect(planDraftSchema.safeParse({ ...draft, amount: "0.00" }).success).toBe(false);
    expect(planDraftSchema.safeParse({ ...draft, relation: "REPLACES_RECURRING" }).success).toBe(false);
    expect(planDraftSchema.safeParse({ ...draft, relation: "REPLACES_BASELINE" }).success).toBe(false);
  });
  it("accepts only a coherent weekly or monthly schedule", () => {
    const recurring = {
      status: "CONFIRMED",
      amount: "100.00",
      schedule: { frequency: "WEEKLY", weekday: 1, dayOfMonth: null, businessDayRule: "FOLLOWING" },
    };
    expect(recurringDraftSchema.safeParse(recurring).success).toBe(true);
    expect(
      recurringDraftSchema.safeParse({ ...recurring, schedule: { ...recurring.schedule, dayOfMonth: 12 } })
        .success,
    ).toBe(false);
    expect(
      recurringDraftSchema.safeParse({
        ...recurring,
        schedule: { frequency: "MONTHLY", weekday: null, dayOfMonth: 31, businessDayRule: "NONE" },
      }).success,
    ).toBe(true);
  });
  it("refuses negative buffers and a horizon other than 30 days", () => {
    const value = {
      forecast: {
        windowWeeks: 12,
        horizonDays: 30,
        bufferAmount: "0.00",
        scenarioCount: 2000,
        minCalibrationOrigins: 12,
        calibrationStepDays: 7,
        algorithm: "WEEKDAY_MEAN_V1",
      },
      autoRecalculate: true,
    };
    expect(settingsDraftSchema.safeParse(value).success).toBe(true);
    expect(
      settingsDraftSchema.safeParse({ ...value, forecast: { ...value.forecast, bufferAmount: "-1.00" } })
        .success,
    ).toBe(false);
    expect(
      settingsDraftSchema.safeParse({ ...value, forecast: { ...value.forecast, horizonDays: 90 } }).success,
    ).toBe(false);
  });
  it("rejects a plan from another account without rewriting its remaining money", () => {
    const value = {
      ...draft,
      id,
      companyId,
      accountId,
      source: "MANUAL",
      sourceDocument: null,
      status: "PARTIALLY_SETTLED",
      settledAmount: "50.00",
      remainingAmount: "75.00",
      overdue: false,
      version: 1,
      knownAt: time,
      createdAt: time,
      updatedAt: time,
    };
    expect(mapPlan(value, companyId, accountId).remainingAmount).toBe("75.00");
    expect(() => mapPlan(value, companyId, id)).toThrow();
  });
  it("does not expose financial error bodies and refuses job scope mismatches", () => {
    const value = {
      id,
      companyId,
      accountId,
      type: "FORECAST",
      status: "FAILED",
      progress: 40,
      resultId: null,
      createdAt: time,
      startedAt: time,
      finishedAt: time,
      error: { code: "INSUFFICIENT_HISTORY", detail: "private-financial-data", traceId: "trace" },
    };
    expect(mapJob(value, companyId, accountId).error?.detail).not.toContain("private-financial-data");
    expect(() => mapJob(value, id, accountId)).toThrow();
  });
  it("requires 30 consecutive server days and masks unavailable scenarios", () => {
    const forecast = JSON.parse(
      readFileSync(
        new URL(
          "../../../../../../contracts/examples/orchestrator/examples/getForecast.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as ForecastRs;
    const mapped = mapForecast(forecast, forecast.companyId, forecast.accountId);
    expect(mapped.days).toHaveLength(30);
    expect(mapped.days[0]?.balance).toBe(forecast.days[0]?.balance);
    expect(() =>
      mapForecast({ ...forecast, days: forecast.days.slice(1) }, forecast.companyId, forecast.accountId),
    ).toThrow();
    expect(() =>
      mapForecast(
        {
          ...forecast,
          days: forecast.days.map((row, index) => (index === 0 ? { ...row, date: forecast.asOfDate } : row)),
        },
        forecast.companyId,
        forecast.accountId,
      ),
    ).toThrow();
    const unavailable = mapForecast(
      {
        ...forecast,
        riskEstimate: { ...forecast.riskEstimate, availability: "INPUT_INCOMPLETE", probability: 0.5 },
      },
      forecast.companyId,
      forecast.accountId,
    );
    expect(unavailable.riskEstimate.probability).toBeNull();
    expect(unavailable.days.every((row) => row.p10 === null && row.p50 === null && row.p90 === null)).toBe(
      true,
    );
  });
  it("retains nullable quality metrics and does not replace missing recall with 100 percent", () => {
    const value = {
      id,
      companyId,
      accountId,
      jobId: id,
      status: "PARTIAL",
      algorithmVersion: "v1",
      scope: "HISTORY_ONLY",
      windowWeeks: 12,
      firstOrigin: "2026-01-01",
      lastOrigin: "2026-02-01",
      staleness: "STALE",
      evaluatedOrigins: 3,
      skippedOrigins: 1,
      evaluatedDays: 90,
      maeBalance: null,
      rmseBalance: null,
      horizons: [],
      gapMetrics: {
        truePositive: 0,
        falsePositive: 0,
        falseNegative: 0,
        precision: null,
        recall: null,
        medianLeadDays: null,
        dateMaeDays: null,
        shortfallMae: null,
      },
      riskMetrics: { brierScore: null, evaluatedCount: 0, calibrationBins: [], interval80Coverage: null },
      warnings: [],
    };
    const result = mapQuality(value, companyId, accountId);
    expect(result.mae).toBeNull();
    expect(result.recall).toBeNull();
    expect(result.stale).toBe(true);
  });
});

describe("history and schedules fail closed", () => {
  it("keeps missing and unknown history out of the factual line", () => {
    for (const status of ["MISSING", "FUTURE_STATUS"])
      expect(mapActual({ date: "2026-10-24", balanceEod: "123.00", status }).balance).toBeNull();
    expect(mapActual({ date: "2026-10-24", balanceEod: "0.00", status: "ZERO_CONFIRMED" }).balance).toBe(
      "0.00",
    );
    expect(
      mapActual({ date: "2026-10-24", balanceEod: "-99999999999999999.99", status: "OBSERVED" }).balance,
    ).toBe("-99999999999999999.99");
  });
  it("does not display a contradictory schedule returned by the server", () => {
    const rule = {
      id,
      accountId,
      direction: "OUT",
      categoryCode: "RENT",
      counterpartyKey: null,
      status: "DETECTED",
      schedule: { frequency: "WEEKLY", weekday: 1, dayOfMonth: 31, businessDayRule: "NONE" },
      amount: "12.00",
      observations: 2,
      firstSeen: "2026-01-01",
      lastSeen: "2026-02-01",
      inputDataVersion: 1,
      detectorVersion: "v1",
      version: 1,
    };
    expect(() => mapRecurring(rule, accountId)).toThrow();
  });
});

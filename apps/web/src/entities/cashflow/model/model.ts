import { z } from "zod";

export const moneySchema = z
  .string()
  .regex(/^-?(0|[1-9][0-9]{0,16})\.[0-9]{2}$/u, "Введите точную сумму в рублях");
export const nonnegativeMoney = z
  .string()
  .regex(/^(0|[1-9][0-9]{0,16})\.[0-9]{2}$/u, "Сумма не может быть отрицательной");
export const positiveMoney = nonnegativeMoney.refine(
  (value) => value !== "0.00",
  "Сумма должна быть больше нуля",
);
export const countSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const versionSchema = countSchema.refine((value) => value > 0);
const bounded = (max: number) =>
  z.string().refine((value) => Array.from(value).length <= max, `Не более ${max} символов`);
const title = bounded(200).refine((value) => /\S/u.test(value), "Введите название");
const probability = z.number().min(0).max(1).nullable();
const direction = z.enum(["IN", "OUT", "UNKNOWN"]).catch("UNKNOWN");
const date = z.iso.date();
const instant = z.iso.datetime();
const code = z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/u, "Выберите категорию");
const warning = z.object({ code: z.string(), message: bounded(1000), date: date.nullable() });
export const pageMetaSchema = z.object({
  page: countSchema,
  size: z.number().int().min(1).max(200),
  total: countSchema,
  hasNext: z.boolean(),
});
export const permissionsSchema = z.object({
  canEditCompany: z.boolean(),
  canManageMembers: z.boolean(),
  canImport: z.boolean(),
  canEditPayments: z.boolean(),
  canManagePlans: z.boolean(),
  canRunForecast: z.boolean(),
  canRunBacktest: z.boolean(),
});

export function businessDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow" }).format(new Date());
}
export function shiftDate(value: string, days: number) {
  const current = new Date(`${date.parse(value)}T12:00:00Z`);
  current.setUTCDate(current.getUTCDate() + days);
  return current.toISOString().slice(0, 10);
}

const planFields = z.object({
  title,
  direction: z.enum(["IN", "OUT"]),
  amount: positiveMoney,
  dueDate: date,
  categoryCode: code,
  counterpartyKey: bounded(150).nullable(),
  note: bounded(2000).nullable(),
  relation: z.enum(["ADDITIONAL", "REPLACES_RECURRING", "REPLACES_BASELINE"]),
  recurringPatternId: z.uuid().nullable(),
  baselineCounterpartyKey: bounded(150).nullable(),
});
export const planDraftSchema = planFields.strict().superRefine((value, context) => {
  if (value.relation === "REPLACES_RECURRING" && !value.recurringPatternId)
    context.addIssue({
      code: "custom",
      path: ["recurringPatternId"],
      message: "Выберите подтверждённую регулярность",
    });
  if (value.relation === "REPLACES_BASELINE" && !value.baselineCounterpartyKey)
    context.addIssue({
      code: "custom",
      path: ["baselineCounterpartyKey"],
      message: "Выберите контрагента из истории",
    });
  if (value.relation !== "REPLACES_RECURRING" && value.recurringPatternId !== null)
    context.addIssue({
      code: "custom",
      path: ["recurringPatternId"],
      message: "Укажите только связь выбранного типа",
    });
  if (value.relation !== "REPLACES_BASELINE" && value.baselineCounterpartyKey !== null)
    context.addIssue({
      code: "custom",
      path: ["baselineCounterpartyKey"],
      message: "Укажите только связь выбранного типа",
    });
});
export type PlanDraft = z.infer<typeof planDraftSchema>;
const planResponse = planFields.extend({
  id: z.uuid(),
  companyId: z.uuid(),
  accountId: z.uuid(),
  direction,
  relation: z.enum(["ADDITIONAL", "REPLACES_RECURRING", "REPLACES_BASELINE", "UNKNOWN"]).catch("UNKNOWN"),
  source: z.enum(["MANUAL", "INVOICE", "TAX", "CONTRACT", "UNKNOWN"]).catch("UNKNOWN"),
  sourceDocument: z
    .object({
      externalSystem: bounded(100),
      externalId: bounded(200),
      documentNumber: bounded(100).nullable(),
      issuedDate: date.nullable(),
    })
    .nullable(),
  status: z.enum(["OPEN", "PARTIALLY_SETTLED", "SETTLED", "CANCELLED", "UNKNOWN"]).catch("UNKNOWN"),
  settledAmount: nonnegativeMoney,
  remainingAmount: nonnegativeMoney,
  overdue: z.boolean(),
  version: versionSchema,
  knownAt: instant,
  createdAt: instant,
  updatedAt: instant,
});
export function mapPlan(value: unknown, companyId: string, accountId: string) {
  return planResponse
    .refine((item) => item.companyId === companyId && item.accountId === accountId)
    .parse(value);
}
export type Plan = ReturnType<typeof mapPlan>;

const schedule = z.object({
  frequency: z.enum(["WEEKLY", "MONTHLY"]),
  weekday: z.number().int().min(1).max(7).nullable(),
  dayOfMonth: z.number().int().min(1).max(31).nullable(),
  businessDayRule: z.enum(["NONE", "FOLLOWING"]),
});
export const recurringDraftSchema = z
  .object({ status: z.enum(["DETECTED", "CONFIRMED", "EXCLUDED"]), amount: positiveMoney, schedule })
  .strict()
  .superRefine((value, context) => {
    const weekly = value.schedule.frequency === "WEEKLY";
    if (
      weekly
        ? value.schedule.weekday === null || value.schedule.dayOfMonth !== null
        : value.schedule.dayOfMonth === null || value.schedule.weekday !== null
    )
      context.addIssue({
        code: "custom",
        path: ["schedule"],
        message: "Укажите день недели или число месяца, но не оба",
      });
  });
export type RecurringDraft = z.infer<typeof recurringDraftSchema>;
const recurring = z.object({
  id: z.uuid(),
  accountId: z.uuid(),
  direction,
  categoryCode: code,
  counterpartyKey: bounded(150).nullable(),
  status: z.enum(["DETECTED", "CONFIRMED", "EXCLUDED", "UNKNOWN"]).catch("UNKNOWN"),
  schedule,
  amount: positiveMoney,
  observations: countSchema,
  firstSeen: date,
  lastSeen: date,
  inputDataVersion: countSchema,
  detectorVersion: bounded(100),
  version: versionSchema,
});
export function mapRecurring(value: unknown, accountId: string) {
  return recurring
    .refine((item) => item.accountId === accountId)
    .refine((item) =>
      item.schedule.frequency === "WEEKLY"
        ? item.schedule.weekday !== null && item.schedule.dayOfMonth === null
        : item.schedule.dayOfMonth !== null && item.schedule.weekday === null,
    )
    .parse(value);
}
export type Recurring = ReturnType<typeof mapRecurring>;

const settings = z.object({
  windowWeeks: z.union([z.literal(8), z.literal(10), z.literal(12)]),
  horizonDays: z.literal(30),
  bufferAmount: nonnegativeMoney,
  scenarioCount: z
    .number({ error: "Введите число от 100 до 5000" })
    .int({ error: "Введите целое число" })
    .min(100, "Минимум 100 сценариев")
    .max(5000, "Максимум 5000 сценариев"),
  minCalibrationOrigins: z
    .number({ error: "Введите число от 12 до 100" })
    .int({ error: "Введите целое число" })
    .min(12, "Минимум 12 срезов")
    .max(100, "Максимум 100 срезов"),
  calibrationStepDays: z.literal(7),
  algorithm: z.literal("WEEKDAY_MEAN_V1"),
});
export const settingsDraftSchema = z.object({ forecast: settings, autoRecalculate: z.boolean() }).strict();
export type SettingsDraft = z.infer<typeof settingsDraftSchema>;
export function mapSettings(value: unknown, accountId: string) {
  return settingsDraftSchema.extend({ accountId: z.literal(accountId), version: versionSchema }).parse(value);
}
export type AccountSettings = ReturnType<typeof mapSettings>;
export const forecastDraftSchema = z
  .object({ asOfDate: date, scope: z.enum(["HISTORY_ONLY", "WITH_KNOWN_PLANS"]) })
  .strict()
  .refine((value) => value.asOfDate <= businessDate(), {
    path: ["asOfDate"],
    message: "Дата расчёта не может быть в будущем",
  });
export type ForecastDraft = z.infer<typeof forecastDraftSchema>;
export const backtestDraftSchema = z
  .object({
    firstOrigin: date,
    lastOrigin: date,
    stepDays: z.number().int().min(7).max(30),
    scope: z.enum(["HISTORY_ONLY", "WITH_KNOWN_PLANS"]),
    windowWeeks: z.union([z.literal(8), z.literal(10), z.literal(12)]),
    evaluateRisk: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.firstOrigin > value.lastOrigin)
      context.addIssue({
        code: "custom",
        path: ["firstOrigin"],
        message: "Начало должно быть не позже конца",
      });
    if (shiftDate(value.lastOrigin, 30) > businessDate())
      context.addIssue({
        code: "custom",
        path: ["lastOrigin"],
        message: "После последнего среза должно пройти 30 дней",
      });
  });
export type BacktestDraft = z.infer<typeof backtestDraftSchema>;

const job = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  accountId: z.uuid(),
  type: z.enum(["FORECAST", "BACKTEST", "DETECT_RECURRING", "UNKNOWN"]).catch("UNKNOWN"),
  status: z.enum(["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED", "UNKNOWN"]).catch("UNKNOWN"),
  progress: z.number().int().min(0).max(100),
  resultId: z.uuid().nullable(),
  error: z.object({ code: z.string(), traceId: bounded(100) }).nullable(),
  createdAt: instant,
});
export function mapJob(value: unknown, companyId: string, accountId: string) {
  const result = job
    .refine((item) => item.companyId === companyId && item.accountId === accountId)
    .parse(value);
  return {
    ...result,
    error: result.error
      ? {
          detail:
            result.error.code === "INSUFFICIENT_HISTORY"
              ? "Недостаточно полных дней истории для расчёта."
              : result.error.code === "BALANCE_ANCHOR_REQUIRED"
                ? "Укажите подтверждённый остаток на дату расчёта."
                : "Расчёт не завершён. Проверьте данные и попробуйте снова.",
          traceId: result.error.traceId,
        }
      : null,
  };
}
export type Job = ReturnType<typeof mapJob>;

const availability = z
  .enum(["AVAILABLE", "INSUFFICIENT_HISTORY", "INPUT_INCOMPLETE", "UNKNOWN"])
  .catch("UNKNOWN");
const risk = z.object({
  availability,
  probability,
  scenarioCount: countSchema,
  calibrationOriginCount: countSchema,
  probabilityCalibrated: z.literal(false),
  assumptions: z.array(bounded(1000)),
});
const gap = z.object({
  id: z.uuid(),
  kind: z.enum(["CASH_GAP", "BUFFER_BREACH", "UNKNOWN"]).catch("UNKNOWN"),
  fromDate: date,
  toDate: date,
  threshold: moneySchema,
  expectedMinimumBalance: moneySchema,
  expectedShortfall: nonnegativeMoney,
  probability,
  shortfallP50: nonnegativeMoney.nullable(),
  shortfallP90: nonnegativeMoney.nullable(),
  shortfallBasis: z.literal("CONDITIONAL_ON_BREACH"),
  riskEstimateAvailability: availability,
});
const forecastResponse = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  accountId: z.uuid(),
  jobId: z.uuid(),
  asOfDate: date,
  horizonDays: z.literal(30),
  scope: z.enum(["HISTORY_ONLY", "WITH_KNOWN_PLANS", "UNKNOWN"]).catch("UNKNOWN"),
  algorithmVersion: bounded(100),
  settings,
  staleness: z.enum(["CURRENT", "STALE", "UNKNOWN"]).catch("UNKNOWN"),
  startBalance: moneySchema,
  startBalanceDate: date,
  quality: z.enum(["GOOD", "LIMITED", "INSUFFICIENT", "UNKNOWN"]).catch("UNKNOWN"),
  warnings: z.array(warning),
  riskEstimate: risk,
  expectedMinimumBalance: moneySchema,
  firstExpectedGapDate: date.nullable(),
  maxExpectedShortfall: nonnegativeMoney,
  days: z
    .array(
      z.object({
        date,
        inflow: moneySchema,
        outflow: moneySchema,
        balance: moneySchema,
        balanceP10: moneySchema.nullable(),
        balanceP50: moneySchema.nullable(),
        balanceP90: moneySchema.nullable(),
        pBelowZero: probability,
        pBelowBuffer: probability,
      }),
    )
    .length(30),
  gaps: z.array(gap),
  createdAt: instant,
});
export function mapForecast(value: unknown, companyId: string, accountId: string) {
  const result = forecastResponse
    .refine((item) => item.companyId === companyId && item.accountId === accountId)
    .refine((item) => item.days.every((day, index) => day.date === shiftDate(item.asOfDate, index + 1)))
    .parse(value);
  const available = result.riskEstimate.availability === "AVAILABLE";
  return {
    ...result,
    riskEstimate: { ...result.riskEstimate, probability: available ? result.riskEstimate.probability : null },
    days: result.days.map((item) => ({
      date: item.date,
      balance: item.balance,
      inflow: item.inflow,
      outflow: item.outflow,
      p10: available ? item.balanceP10 : null,
      p50: available ? item.balanceP50 : null,
      p90: available ? item.balanceP90 : null,
    })),
    gaps: result.gaps.map((item) => ({
      ...item,
      probability: item.riskEstimateAvailability === "AVAILABLE" ? item.probability : null,
    })),
  };
}
export type Forecast = ReturnType<typeof mapForecast>;

const qualityResponse = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  accountId: z.uuid(),
  jobId: z.uuid(),
  status: z.enum(["COMPLETE", "PARTIAL", "UNKNOWN"]).catch("UNKNOWN"),
  algorithmVersion: bounded(100),
  scope: z.string(),
  windowWeeks: z.number().int(),
  firstOrigin: date,
  lastOrigin: date,
  staleness: z.string(),
  evaluatedOrigins: countSchema,
  skippedOrigins: countSchema,
  evaluatedDays: countSchema,
  maeBalance: moneySchema.nullable(),
  rmseBalance: moneySchema.nullable(),
  horizons: z.array(
    z.object({
      horizonDay: z.number().int().min(1).max(30),
      maeBalance: moneySchema.nullable(),
      rmseBalance: moneySchema.nullable(),
      evaluatedCount: countSchema,
    }),
  ),
  gapMetrics: z.object({
    precision: probability,
    recall: probability,
    truePositive: countSchema,
    falsePositive: countSchema,
    falseNegative: countSchema,
    medianLeadDays: z.number().nullable(),
    dateMaeDays: z.number().nullable(),
    shortfallMae: moneySchema.nullable(),
  }),
  riskMetrics: z.object({
    brierScore: probability,
    evaluatedCount: countSchema,
    interval80Coverage: probability,
    calibrationBins: z.array(
      z.object({
        fromProbability: z.number().min(0).max(1),
        toProbability: z.number().min(0).max(1),
        count: countSchema,
        meanProbability: probability,
        observedRate: probability,
      }),
    ),
  }),
  warnings: z.array(warning),
});
export function mapQuality(value: unknown, companyId: string, accountId: string) {
  const item = qualityResponse
    .refine((row) => row.companyId === companyId && row.accountId === accountId)
    .parse(value);
  return {
    id: item.id,
    jobId: item.jobId,
    status: item.status,
    stale: item.staleness !== "CURRENT",
    firstOrigin: item.firstOrigin,
    lastOrigin: item.lastOrigin,
    scope: item.scope,
    windowWeeks: item.windowWeeks,
    algorithmVersion: item.algorithmVersion,
    evaluatedOrigins: item.evaluatedOrigins,
    skippedOrigins: item.skippedOrigins,
    evaluatedDays: item.evaluatedDays,
    mae: item.maeBalance,
    rmse: item.rmseBalance,
    horizons: item.horizons.map((row) => ({
      day: row.horizonDay,
      mae: row.maeBalance,
      rmse: row.rmseBalance,
      count: row.evaluatedCount,
    })),
    precision: item.gapMetrics.precision,
    recall: item.gapMetrics.recall,
    truePositive: item.gapMetrics.truePositive,
    falsePositive: item.gapMetrics.falsePositive,
    falseNegative: item.gapMetrics.falseNegative,
    leadDays: item.gapMetrics.medianLeadDays,
    dateMaeDays: item.gapMetrics.dateMaeDays,
    shortfallMae: item.gapMetrics.shortfallMae,
    brier: item.riskMetrics.brierScore,
    riskCount: item.riskMetrics.evaluatedCount,
    coverage: item.riskMetrics.interval80Coverage,
    calibrationBins: item.riskMetrics.calibrationBins.map((row) => ({
      from: row.fromProbability,
      to: row.toProbability,
      count: row.count,
      mean: row.meanProbability,
      observed: row.observedRate,
    })),
    origins: [] as Origin[],
    warnings: item.warnings.map((row) => row.message),
  };
}
export type Quality = ReturnType<typeof mapQuality>;
const origin = z.object({
  asOfDate: date,
  status: z.enum(["EVALUATED", "SKIPPED", "UNKNOWN"]).catch("UNKNOWN"),
  reason: bounded(1000).nullable(),
  evaluatedDays: countSchema,
  maeBalance: moneySchema.nullable(),
});
export function mapOrigin(value: unknown) {
  const item = origin.parse(value);
  return {
    date: item.asOfDate,
    evaluated: item.status === "EVALUATED",
    status: item.status,
    reason: item.reason,
    days: item.evaluatedDays,
    mae: item.maeBalance,
  };
}
export type Origin = ReturnType<typeof mapOrigin>;

const dataQuality = z.object({
  accountId: z.uuid(),
  fromDate: date.nullable(),
  toDate: date.nullable(),
  quality: z.enum(["GOOD", "LIMITED", "INSUFFICIENT", "UNKNOWN"]).catch("UNKNOWN"),
  completeDayCount: countSchema,
  missingDayCount: countSchema,
  balanceMismatchCount: countSchema,
  emptyPurposeCount: countSchema,
  warnings: z.array(warning),
});
export function mapDataQuality(value: unknown, accountId: string) {
  return dataQuality.refine((row) => row.accountId === accountId).parse(value);
}
export function mapActual(value: unknown) {
  const row = z.object({ date, balanceEod: moneySchema.nullable(), status: z.string() }).parse(value);
  return {
    date: row.date,
    balance: ["OBSERVED", "ZERO_CONFIRMED"].includes(row.status) ? row.balanceEod : null,
  };
}
const alert = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  accountId: z.uuid(),
  type: z.string(),
  title,
  description: bounded(2000),
  forecastId: z.uuid().nullable(),
  gapId: z.uuid().nullable(),
  expectedPaymentId: z.uuid().nullable(),
  date: date.nullable(),
  shortfall: moneySchema.nullable(),
  probability,
  active: z.boolean(),
  acknowledgedAt: instant.nullable(),
  version: versionSchema,
});
export function mapAlert(value: unknown, companyId: string, accountId: string) {
  return alert.refine((row) => row.companyId === companyId && row.accountId === accountId).parse(value);
}
export type Alert = ReturnType<typeof mapAlert>;
export function mapDashboard(value: unknown, companyId: string, accountId: string) {
  const row = z
    .object({
      companyId: z.literal(companyId),
      accountId: z.literal(accountId),
      asOfDate: date,
      dataVersion: countSchema,
      currentBalance: z
        .object({
          accountId: z.literal(accountId),
          balance: moneySchema,
          date,
          source: z.string(),
          reason: bounded(500).nullable(),
        })
        .nullable(),
      latestForecast: z.unknown(),
      latestBacktest: z.unknown(),
      activeAlerts: z.array(z.unknown()),
      upcomingPayments: z.array(z.unknown()),
      quality: z.unknown(),
      runningJobs: z.array(z.unknown()),
      permissions: permissionsSchema,
    })
    .parse(value);
  return {
    ...row,
    latestForecast:
      row.latestForecast === null ? null : mapForecast(row.latestForecast, companyId, accountId),
    latestBacktest: row.latestBacktest === null ? null : mapQuality(row.latestBacktest, companyId, accountId),
    activeAlerts: row.activeAlerts.map((item) => mapAlert(item, companyId, accountId)),
    upcomingPayments: row.upcomingPayments.map((item) => mapPlan(item, companyId, accountId)),
    quality: mapDataQuality(row.quality, accountId),
    runningJobs: row.runningJobs.map((item) => mapJob(item, companyId, accountId)),
  };
}
export type Dashboard = ReturnType<typeof mapDashboard>;
export function mapGapDetails(value: unknown, forecast: Forecast, gapId: string) {
  const row = z
    .object({
      forecastId: z.literal(forecast.id),
      gap: gap.refine((item) => item.id === gapId && forecast.gaps.some((known) => known.id === item.id)),
      factors: z.array(
        z.object({
          title,
          description: bounded(1000),
          amount: moneySchema.nullable(),
          date: date.nullable(),
        }),
      ),
      recommendations: z.array(
        z.object({ title, description: bounded(1000), requiresUserAgreement: z.boolean() }),
      ),
    })
    .parse(value);
  return {
    kind: row.gap.kind,
    from: row.gap.fromDate,
    to: row.gap.toDate,
    minimumBalance: row.gap.expectedMinimumBalance,
    shortfall: row.gap.expectedShortfall,
    threshold: row.gap.threshold,
    shortfallP50: row.gap.shortfallP50,
    shortfallP90: row.gap.shortfallP90,
    availability: row.gap.riskEstimateAvailability,
    probability: row.gap.riskEstimateAvailability === "AVAILABLE" ? row.gap.probability : null,
    scenarioCount: forecast.riskEstimate.scenarioCount,
    originCount: forecast.riskEstimate.calibrationOriginCount,
    assumptions: forecast.riskEstimate.assumptions,
    factors: row.factors,
    actions: row.recommendations.map((item) => ({
      title: item.title,
      description: item.description,
      requiresAgreement: item.requiresUserAgreement,
    })),
  };
}
export const reasonSchema = z
  .object({ reason: bounded(500).refine((value) => /\S/u.test(value), "Укажите основание") })
  .strict();
export const allocationDraftSchema = z
  .object({ paymentId: z.uuid("Выберите операцию"), amount: positiveMoney })
  .strict();
export type AllocationDraft = z.infer<typeof allocationDraftSchema>;
export function mapAllocation(value: unknown, planId: string) {
  return z
    .object({
      id: z.uuid(),
      expectedPaymentId: z.literal(planId),
      paymentId: z.uuid(),
      amount: positiveMoney,
      createdAt: instant,
    })
    .parse(value);
}
export type Allocation = ReturnType<typeof mapAllocation>;
export const memberDraftSchema = z
  .object({
    userId: z.uuid("Введите ID зарегистрированного пользователя"),
    role: z.enum(["ACCOUNTANT", "VIEWER"]),
  })
  .strict();
export type MemberDraft = z.infer<typeof memberDraftSchema>;
export function mapMember(value: unknown) {
  return z
    .object({
      userId: z.uuid(),
      role: z.enum(["OWNER", "ACCOUNTANT", "VIEWER", "UNKNOWN"]).catch("UNKNOWN"),
      joinedAt: instant,
      version: versionSchema,
    })
    .parse(value);
}
export type Member = ReturnType<typeof mapMember>;
export const completenessDraftSchema = z
  .object({
    fromDate: date,
    toDate: date,
    completeness: z.enum(["CONFIRMED_COMPLETE", "UNKNOWN"]),
    reason: reasonSchema.shape.reason,
  })
  .strict()
  .refine((value) => value.fromDate <= value.toDate && value.toDate <= businessDate(), {
    path: ["fromDate"],
    message: "Проверьте период: только прошедшие даты в правильном порядке",
  });
export type CompletenessDraft = z.infer<typeof completenessDraftSchema>;
export function mapCompleteness(value: unknown, accountId: string) {
  return z
    .object({
      id: z.uuid(),
      accountId: z.literal(accountId),
      fromDate: date,
      toDate: date,
      completeness: z.enum(["CONFIRMED_COMPLETE", "UNKNOWN"]),
      reason: bounded(500),
      createdAt: instant,
    })
    .parse(value);
}
export const externalRegisterSchema = z
  .object({
    externalSource: z.enum(["ACCOUNTING_EXPORT", "INVOICE_REGISTER", "TAX_REGISTER"]),
    items: z
      .array(
        planFields
          .extend({
            accountId: z.uuid(),
            source: z.enum(["INVOICE", "TAX", "CONTRACT"]),
            sourceDocument: z
              .object({
                externalSystem: bounded(100).refine((value) => /\S/u.test(value), "Укажите источник"),
                externalId: title,
                documentNumber: bounded(100).nullable(),
                issuedDate: date.nullable(),
              })
              .strict(),
            expectedVersion: versionSchema.nullable(),
          })
          .strict()
          .superRefine((value, context) => {
            const relation = planDraftSchema.safeParse(planFields.parse(value));
            if (!relation.success)
              for (const issue of relation.error.issues)
                context.addIssue({ code: "custom", path: issue.path, message: issue.message });
          }),
      )
      .min(1)
      .max(500),
  })
  .strict();
export type ExternalRegister = z.infer<typeof externalRegisterSchema>;

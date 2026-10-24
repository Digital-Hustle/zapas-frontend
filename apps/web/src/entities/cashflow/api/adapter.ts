import {
  getDashboard,
  getDailyActuals,
  getDataQuality,
  getForecast,
  getGapDetails,
  createForecast,
  createBacktest,
  getBacktest,
  listBacktests,
  listBacktestOrigins,
  listJobs,
  getJob,
  cancelJob,
  listRecurring,
  detectRecurring,
  updateRecurring,
  listExpectedPayments,
  getExpectedPayment,
  createExpectedPayment,
  updateExpectedPayment,
  cancelExpectedPayment,
  listAllocations,
  allocatePayment,
  deleteAllocation,
  importExpectedPayments,
  listAlerts,
  acknowledgeAlert,
  getSettings,
  updateSettings,
  listMembers,
  addMember,
  updateMember,
  removeMember,
  listCompleteness,
  setCompleteness,
} from "@zapas/api/orchestrator";
import { z } from "zod";
import { businessCall } from "@/shared/api/problem.ts";
import {
  mapDashboard,
  mapActual,
  mapDataQuality,
  mapForecast,
  mapGapDetails,
  mapQuality,
  mapOrigin,
  mapJob,
  mapRecurring,
  mapPlan,
  mapAllocation,
  mapAlert,
  mapSettings,
  mapMember,
  mapCompleteness,
  pageMetaSchema,
  versionSchema,
  forecastDraftSchema,
  backtestDraftSchema,
  planDraftSchema,
  recurringDraftSchema,
  settingsDraftSchema,
  reasonSchema,
  allocationDraftSchema,
  memberDraftSchema,
  externalRegisterSchema,
  completenessDraftSchema,
  type Forecast,
  type ForecastDraft,
  type BacktestDraft,
  type PlanDraft,
  type RecurringDraft,
  type SettingsDraft,
  type AllocationDraft,
  type MemberDraft,
  type ExternalRegister,
  type CompletenessDraft,
} from "../model/model.ts";

const quiet: RequestInit & { silent: true } = { silent: true };
const uuid = z.uuid();
const match = (version: number) => `"${versionSchema.parse(version)}"`;
const keyHeader = (key: string) => ({ "Idempotency-Key": uuid.parse(key) });
const page = <T>(value: { items: unknown[]; page: unknown }, map: (item: unknown) => T) => ({
  items: value.items.map(map),
  page: pageMetaSchema.parse(value.page),
});
const listParams = (accountId: string, number: number) => ({
  accountId: uuid.parse(accountId),
  page: number,
  size: 20,
});

function sameId<T extends { id: string }>(value: T, expectedId: string): T {
  z.literal(expectedId).parse(value.id);
  return value;
}
function jobType<T extends { type: string }>(value: T, expected: string): T {
  z.literal(expected).parse(value.type);
  return value;
}
function memberId<T extends { userId: string }>(value: T, expected: string): T {
  z.literal(expected).parse(value.userId);
  return value;
}

export const cashflowApi = {
  dashboard: (companyId: string, accountId: string, signal: AbortSignal) =>
    businessCall(async () =>
      mapDashboard(
        await getDashboard(uuid.parse(companyId), { accountId: uuid.parse(accountId) }, { ...quiet, signal }),
        companyId,
        accountId,
      ),
    ),
  actuals: (companyId: string, accountId: string, from: string, to: string, signal: AbortSignal) =>
    businessCall(async () => {
      const response = await getDailyActuals(
        uuid.parse(companyId),
        uuid.parse(accountId),
        { fromDate: z.iso.date().parse(from), toDate: z.iso.date().parse(to) },
        { ...quiet, signal },
      );
      return response.items.map(mapActual).filter((item) => item.date >= from && item.date <= to);
    }),
  dataQuality: (companyId: string, accountId: string, signal: AbortSignal) =>
    businessCall(async () =>
      mapDataQuality(
        await getDataQuality(uuid.parse(companyId), uuid.parse(accountId), { ...quiet, signal }),
        accountId,
      ),
    ),
  forecast: (companyId: string, accountId: string, id: string, signal: AbortSignal) =>
    businessCall(async () => {
      const value = mapForecast(
        await getForecast(uuid.parse(companyId), uuid.parse(id), { ...quiet, signal }),
        companyId,
        accountId,
      );
      z.literal(id).parse(value.id);
      return value;
    }),
  gap: (companyId: string, forecast: Forecast, id: string, signal: AbortSignal) =>
    businessCall(async () =>
      mapGapDetails(
        await getGapDetails(uuid.parse(companyId), uuid.parse(forecast.id), uuid.parse(id), {
          ...quiet,
          signal,
        }),
        forecast,
        id,
      ),
    ),
  startForecast: (companyId: string, accountId: string, draft: ForecastDraft, key: string) =>
    businessCall(async () =>
      jobType(
        mapJob(
          await createForecast(
            uuid.parse(companyId),
            { ...forecastDraftSchema.parse(draft), accountId: uuid.parse(accountId) },
            keyHeader(key),
            quiet,
          ),
          companyId,
          accountId,
        ),
        "FORECAST",
      ),
    ),
  startBacktest: (companyId: string, accountId: string, draft: BacktestDraft, key: string) =>
    businessCall(async () =>
      jobType(
        mapJob(
          await createBacktest(
            uuid.parse(companyId),
            { ...backtestDraftSchema.parse(draft), accountId: uuid.parse(accountId) },
            keyHeader(key),
            quiet,
          ),
          companyId,
          accountId,
        ),
        "BACKTEST",
      ),
    ),
  backtests: (companyId: string, accountId: string, number: number, signal: AbortSignal) =>
    businessCall(async () =>
      page(
        await listBacktests(uuid.parse(companyId), listParams(accountId, number), { ...quiet, signal }),
        (item) => mapQuality(item, companyId, accountId),
      ),
    ),
  backtest: (companyId: string, accountId: string, id: string, signal: AbortSignal) =>
    businessCall(async () => {
      const value = mapQuality(
        await getBacktest(uuid.parse(companyId), uuid.parse(id), { ...quiet, signal }),
        companyId,
        accountId,
      );
      z.literal(id).parse(value.id);
      return value;
    }),
  origins: (companyId: string, id: string, number: number, signal: AbortSignal) =>
    businessCall(async () =>
      page(
        await listBacktestOrigins(
          uuid.parse(companyId),
          uuid.parse(id),
          { page: number, size: 20 },
          { ...quiet, signal },
        ),
        mapOrigin,
      ),
    ),
  jobs: (companyId: string, accountId: string, number: number, signal: AbortSignal) =>
    businessCall(async () =>
      page(
        await listJobs(uuid.parse(companyId), listParams(accountId, number), { ...quiet, signal }),
        (item) => mapJob(item, companyId, accountId),
      ),
    ),
  job: (companyId: string, accountId: string, id: string, signal: AbortSignal) =>
    businessCall(async () => {
      const value = mapJob(
        await getJob(uuid.parse(companyId), uuid.parse(id), { ...quiet, signal }),
        companyId,
        accountId,
      );
      z.literal(id).parse(value.id);
      return value;
    }),
  cancelJob: (companyId: string, accountId: string, id: string, key: string) =>
    businessCall(async () =>
      sameId(
        mapJob(
          await cancelJob(uuid.parse(companyId), uuid.parse(id), keyHeader(key), quiet),
          companyId,
          accountId,
        ),
        id,
      ),
    ),
  recurring: (companyId: string, accountId: string, number: number, signal: AbortSignal) =>
    businessCall(async () =>
      page(
        await listRecurring(uuid.parse(companyId), listParams(accountId, number), { ...quiet, signal }),
        (item) => mapRecurring(item, accountId),
      ),
    ),
  detect: (companyId: string, accountId: string, asOfDate: string, key: string) =>
    businessCall(async () =>
      jobType(
        mapJob(
          await detectRecurring(
            uuid.parse(companyId),
            { accountId: uuid.parse(accountId), asOfDate: z.iso.date().parse(asOfDate) },
            keyHeader(key),
            quiet,
          ),
          companyId,
          accountId,
        ),
        "DETECT_RECURRING",
      ),
    ),
  updateRecurring: (
    companyId: string,
    accountId: string,
    id: string,
    draft: RecurringDraft,
    version: number,
  ) =>
    businessCall(async () =>
      sameId(
        mapRecurring(
          await updateRecurring(
            uuid.parse(companyId),
            uuid.parse(id),
            recurringDraftSchema.parse(draft),
            { "If-Match": match(version) },
            quiet,
          ),
          accountId,
        ),
        id,
      ),
    ),
  plans: (
    companyId: string,
    accountId: string,
    number: number,
    status: "ALL" | "OPEN" | "PARTIALLY_SETTLED" | "SETTLED" | "CANCELLED",
    signal: AbortSignal,
  ) =>
    businessCall(async () =>
      page(
        await listExpectedPayments(
          uuid.parse(companyId),
          { ...listParams(accountId, number), ...(status === "ALL" ? {} : { status }) },
          { ...quiet, signal },
        ),
        (item) => mapPlan(item, companyId, accountId),
      ),
    ),
  plan: (companyId: string, accountId: string, id: string, signal: AbortSignal) =>
    businessCall(async () => {
      const value = mapPlan(
        await getExpectedPayment(uuid.parse(companyId), uuid.parse(id), { ...quiet, signal }),
        companyId,
        accountId,
      );
      z.literal(id).parse(value.id);
      return value;
    }),
  createPlan: (companyId: string, accountId: string, draft: PlanDraft, key: string) =>
    businessCall(async () =>
      mapPlan(
        await createExpectedPayment(
          uuid.parse(companyId),
          { ...planDraftSchema.parse(draft), accountId: uuid.parse(accountId) },
          keyHeader(key),
          quiet,
        ),
        companyId,
        accountId,
      ),
    ),
  updatePlan: (companyId: string, accountId: string, id: string, draft: PlanDraft, version: number) =>
    businessCall(async () =>
      sameId(
        mapPlan(
          await updateExpectedPayment(
            uuid.parse(companyId),
            uuid.parse(id),
            { ...planDraftSchema.parse(draft), accountId: uuid.parse(accountId) },
            { "If-Match": match(version) },
            quiet,
          ),
          companyId,
          accountId,
        ),
        id,
      ),
    ),
  cancelPlan: (
    companyId: string,
    accountId: string,
    id: string,
    reason: string,
    version: number,
    key: string,
  ) =>
    businessCall(async () =>
      sameId(
        mapPlan(
          await cancelExpectedPayment(
            uuid.parse(companyId),
            uuid.parse(id),
            reasonSchema.parse({ reason }),
            { ...keyHeader(key), "If-Match": match(version) },
            quiet,
          ),
          companyId,
          accountId,
        ),
        id,
      ),
    ),
  allocations: (companyId: string, id: string, number: number, signal: AbortSignal) =>
    businessCall(async () =>
      page(
        await listAllocations(
          uuid.parse(companyId),
          uuid.parse(id),
          { page: number, size: 20 },
          { ...quiet, signal },
        ),
        (item) => mapAllocation(item, id),
      ),
    ),
  allocate: (companyId: string, planId: string, draft: AllocationDraft, version: number, key: string) =>
    businessCall(async () =>
      mapAllocation(
        await allocatePayment(
          uuid.parse(companyId),
          uuid.parse(planId),
          allocationDraftSchema.parse(draft),
          { ...keyHeader(key), "If-Match": match(version) },
          quiet,
        ),
        planId,
      ),
    ),
  deleteAllocation: (companyId: string, planId: string, id: string, version: number) =>
    businessCall(async () =>
      deleteAllocation(
        uuid.parse(companyId),
        uuid.parse(planId),
        uuid.parse(id),
        { "If-Match": match(version) },
        quiet,
      ),
    ),
  importPlans: (companyId: string, accountId: string, draft: ExternalRegister, key: string) =>
    businessCall(async () => {
      const value = externalRegisterSchema.parse(draft);
      if (value.items.some((item) => item.accountId !== accountId))
        throw new z.ZodError([{ code: "custom", path: ["items"], message: "Другой счёт" }]);
      for (const item of value.items)
        planDraftSchema.parse({
          title: item.title,
          direction: item.direction,
          amount: item.amount,
          dueDate: item.dueDate,
          categoryCode: item.categoryCode,
          counterpartyKey: item.counterpartyKey,
          note: item.note,
          relation: item.relation,
          recurringPatternId: item.recurringPatternId,
          baselineCounterpartyKey: item.baselineCounterpartyKey,
        });
      const result = await importExpectedPayments(uuid.parse(companyId), value, keyHeader(key), quiet);
      return {
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        unchangedCount: result.unchangedCount,
        items: result.items.map((item) => mapPlan(item, companyId, accountId)),
      };
    }),
  alerts: (
    companyId: string,
    accountId: string,
    number: number,
    active: boolean | null,
    signal: AbortSignal,
  ) =>
    businessCall(async () =>
      page(
        await listAlerts(
          uuid.parse(companyId),
          { ...listParams(accountId, number), ...(active === null ? {} : { active }) },
          { ...quiet, signal },
        ),
        (item) => mapAlert(item, companyId, accountId),
      ),
    ),
  acknowledge: (companyId: string, accountId: string, id: string, version: number, key: string) =>
    businessCall(async () =>
      sameId(
        mapAlert(
          await acknowledgeAlert(
            uuid.parse(companyId),
            uuid.parse(id),
            { ...keyHeader(key), "If-Match": match(version) },
            quiet,
          ),
          companyId,
          accountId,
        ),
        id,
      ),
    ),
  settings: (companyId: string, accountId: string, signal: AbortSignal) =>
    businessCall(async () =>
      mapSettings(
        await getSettings(uuid.parse(companyId), uuid.parse(accountId), { ...quiet, signal }),
        accountId,
      ),
    ),
  updateSettings: (companyId: string, accountId: string, draft: SettingsDraft, version: number) =>
    businessCall(async () =>
      mapSettings(
        await updateSettings(
          uuid.parse(companyId),
          uuid.parse(accountId),
          settingsDraftSchema.parse(draft),
          { "If-Match": match(version) },
          quiet,
        ),
        accountId,
      ),
    ),
  members: (companyId: string, number: number, signal: AbortSignal) =>
    businessCall(async () =>
      page(
        await listMembers(uuid.parse(companyId), { page: number, size: 20 }, { ...quiet, signal }),
        mapMember,
      ),
    ),
  addMember: (companyId: string, draft: MemberDraft, key: string) =>
    businessCall(async () =>
      memberId(
        mapMember(
          await addMember(uuid.parse(companyId), memberDraftSchema.parse(draft), keyHeader(key), quiet),
        ),
        draft.userId,
      ),
    ),
  updateMember: (companyId: string, id: string, role: "ACCOUNTANT" | "VIEWER", version: number) =>
    businessCall(async () =>
      memberId(
        mapMember(
          await updateMember(
            uuid.parse(companyId),
            uuid.parse(id),
            { role },
            { "If-Match": match(version) },
            quiet,
          ),
        ),
        id,
      ),
    ),
  removeMember: (companyId: string, id: string, version: number) =>
    businessCall(async () =>
      removeMember(uuid.parse(companyId), uuid.parse(id), { "If-Match": match(version) }, quiet),
    ),
  completeness: (companyId: string, accountId: string, number: number, signal: AbortSignal) =>
    businessCall(async () =>
      page(
        await listCompleteness(
          uuid.parse(companyId),
          uuid.parse(accountId),
          { page: number, size: 20 },
          { ...quiet, signal },
        ),
        (item) => mapCompleteness(item, accountId),
      ),
    ),
  setCompleteness: (companyId: string, accountId: string, draft: CompletenessDraft, key: string) =>
    businessCall(async () =>
      mapCompleteness(
        await setCompleteness(
          uuid.parse(companyId),
          uuid.parse(accountId),
          completenessDraftSchema.parse(draft),
          keyHeader(key),
          quiet,
        ),
        accountId,
      ),
    ),
};

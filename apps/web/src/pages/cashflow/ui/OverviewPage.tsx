import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Controller } from "react-hook-form";
import { Amount, Badge, Button, DatePicker, ErrorState, Field, RadioGroup, buttonVariants } from "@zapas/ui";
import { ForecastChart } from "@zapas/charts";
import { BusinessWorkspace, type BusinessScope } from "@/widgets/business-workspace";
import { PostForm } from "@/features/cashflow-actions";
import {
  cashflowApi,
  useCashflow,
  forecastDraftSchema,
  businessDate,
  shiftDate,
  type Job,
  type Forecast,
} from "@/entities/cashflow";
import { RiskDetails } from "@/widgets/forecast-insights";
import { accessDenied } from "@/shared/api/problem.ts";
import { accountPath, scopeId } from "@/shared/lib/workspace-path.ts";
import { JobStatus, MoneyMetric, NoRows, QueryState, ReadOnly, Section } from "./parts.tsx";
import { useRefresh, visible } from "../model/helpers.ts";

function Gap({ scope, forecast, id }: { scope: BusinessScope; forecast: Forecast; id: string }) {
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "gap",
    (signal) => cashflowApi.gap(scope.company.id, forecast, id, signal),
    scope.active,
    [forecast.id, id],
  );
  return (
    <>
      <QueryState query={query} recovery={scope.recovery} />
      {visible(query) && query.data && <RiskDetails data={query.data} />}
    </>
  );
}
function ForecastResult({ scope, forecast }: { scope: BusinessScope; forecast: Forecast }) {
  const [params] = useSearchParams();
  const [selectedGap, setSelectedGap] = useState<string | null>(() => scopeId(params.get("gap")));
  const actuals = useCashflow(
    scope.company.id,
    scope.account.id,
    "actuals",
    (signal) =>
      cashflowApi.actuals(
        scope.company.id,
        scope.account.id,
        shiftDate(forecast.asOfDate, -29),
        forecast.asOfDate,
        signal,
      ),
    scope.active,
    [forecast.asOfDate],
  );
  return (
    <div className="space-y-6">
      {forecast.staleness !== "CURRENT" && (
        <p role="status" className="bg-warning-soft text-warning-soft-foreground rounded-md p-4">
          Прогноз устарел. Он сохранён по состоянию на {forecast.asOfDate}; новые данные требуют пересчёта.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MoneyMetric label="Минимальный ожидаемый остаток" value={forecast.expectedMinimumBalance} />
        <MoneyMetric label="Максимальная ожидаемая нехватка" value={forecast.maxExpectedShortfall} />
        <div className="border-border rounded-md border p-4">
          <p className="text-muted-foreground text-sm">Первый ожидаемый разрыв</p>
          <p className="mt-2 text-lg font-semibold">
            {forecast.firstExpectedGapDate ?? "Не ожидается по точечному прогнозу"}
          </p>
        </div>
      </div>
      <Section title="Прогноз остатка на 30 дней">
        <QueryState query={actuals} recovery={scope.recovery} />
        <ForecastChart
          points={forecast.days}
          actuals={visible(actuals) ? (actuals.data ?? []) : []}
          asOfDate={forecast.asOfDate}
          threshold={forecast.settings.bufferAmount}
          label="Остаток: факт и прогноз"
        />
        <p className="text-muted-foreground text-sm">
          {forecast.riskEstimate.availability === "AVAILABLE" && forecast.riskEstimate.probability !== null
            ? `Сценарная вероятность разрыва: ${new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 }).format(forecast.riskEstimate.probability)}. Это оценка по истории, не точность модели.`
            : "Вероятность пока недоступна"}
        </p>
        {forecast.warnings.map((warning, index) => (
          <p key={index} className="text-warning-soft-foreground text-sm">
            {warning.message}
          </p>
        ))}
        <details>
          <summary className="cursor-pointer font-medium">Поступления и списания по дням</summary>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Серверные потоки по 30 дням</caption>
              <thead>
                <tr>
                  <th className="p-2">Дата</th>
                  <th className="p-2">Поступления</th>
                  <th className="p-2">Списания</th>
                </tr>
              </thead>
              <tbody>
                {forecast.days.map((day) => (
                  <tr key={day.date}>
                    <td className="p-2">{day.date}</td>
                    <td className="p-2">
                      <Amount value={day.inflow} animated={false} className="break-all" />
                    </td>
                    <td className="p-2">
                      <Amount value={day.outflow} animated={false} className="break-all" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Section>
      <Section title="Разрывы и факторы риска">
        {forecast.gaps.length === 0 ? (
          <p>Эпизодов разрыва по этому прогнозу нет. Прогноз не гарантирует будущий остаток.</p>
        ) : (
          forecast.gaps.map((gap) => (
            <div key={gap.id} className="border-border space-y-3 rounded-md border p-4">
              <p className="font-medium">
                {gap.kind === "CASH_GAP"
                  ? "Нехватка денег"
                  : gap.kind === "BUFFER_BREACH"
                    ? "Нарушение запаса"
                    : "Неизвестный тип эпизода"}
                : {gap.fromDate} — {gap.toDate}
              </p>
              <MoneyMetric label="Ожидаемая нехватка" value={gap.expectedShortfall} />
              <Button size="sm" variant="secondary" onClick={() => setSelectedGap(gap.id)}>
                Факторы и возможные действия
              </Button>
            </div>
          ))
        )}
      </Section>
      {selectedGap && forecast.gaps.some((gap) => gap.id === selectedGap) && (
        <Gap key={`${forecast.id}/${selectedGap}`} scope={scope} forecast={forecast} id={selectedGap} />
      )}
    </div>
  );
}
function Overview({ scope }: { scope: BusinessScope }) {
  const [params, setParams] = useSearchParams();
  const resultId = scopeId(params.get("result"));
  const [job, setJob] = useState<Job | null>(null);
  const refresh = useRefresh(scope);
  const dashboard = useCashflow(
    scope.company.id,
    scope.account.id,
    "dashboard",
    (signal) => cashflowApi.dashboard(scope.company.id, scope.account.id, signal),
    scope.active,
  );
  const result = useCashflow(
    scope.company.id,
    scope.account.id,
    "forecast-result",
    (signal) => cashflowApi.forecast(scope.company.id, scope.account.id, resultId ?? "", signal),
    scope.active && resultId !== null,
    [resultId],
  );
  const finished = useCallback(
    (value: Job) => {
      setJob(value);
      if (value.status === "SUCCEEDED" && value.resultId)
        setParams(
          (current) => {
            const next = new URLSearchParams(current);
            next.set("result", value.resultId ?? "");
            return next;
          },
          { replace: true },
        );
      refresh();
    },
    [refresh, setParams],
  );
  const running = job ?? dashboard.data?.runningJobs.find((item) => item.type === "FORECAST") ?? null;
  const activeJob = running?.status === "QUEUED" || running?.status === "RUNNING";
  const allowed =
    scope.writable &&
    scope.company.permissions.canRunForecast &&
    !dashboard.isError &&
    dashboard.data?.permissions.canRunForecast === true;
  if (dashboard.isError && accessDenied(dashboard.error))
    return <QueryState query={dashboard} recovery={scope.recovery} />;
  return (
    <div className="space-y-6">
      {params.has("result") && !resultId && (
        <ErrorState
          title="Некорректная ссылка на прогноз"
          description="Откройте сохранённый результат из списка расчётов."
        />
      )}
      <div className="flex flex-wrap gap-3">
        <Link
          to={accountPath("imports", scope.company.id, scope.account.id)}
          className={buttonVariants({ size: "sm" })}
        >
          Загрузить выписку CSV
        </Link>
        <Button
          size="sm"
          variant="secondary"
          loading={dashboard.isFetching}
          onClick={() => void dashboard.refetch()}
        >
          Обновить обзор
        </Button>
      </div>
      <ReadOnly scope={scope} />
      <QueryState query={dashboard} recovery={scope.recovery} />
      {visible(dashboard) && dashboard.data && (
        <>
          <MoneyMetric
            label={`Подтверждённый остаток на ${dashboard.data.currentBalance?.date ?? "неизвестную дату"}`}
            value={dashboard.data.currentBalance?.balance ?? null}
          />
          {!dashboard.data.currentBalance && (
            <p className="text-warning-soft-foreground text-sm">
              Загрузите историю или укажите подтверждённый остаток в реквизитах счёта. Отсутствующий остаток
              не считается нулём.
            </p>
          )}
          <Section title="Качество входных данных">
            <p className="text-sm">
              Полных дней: {dashboard.data.quality.completeDayCount} · Пропущено:{" "}
              {dashboard.data.quality.missingDayCount} · Расхождений остатка:{" "}
              {dashboard.data.quality.balanceMismatchCount}
            </p>
            {dashboard.data.quality.warnings.map((warning, index) => (
              <p key={index} className="text-warning-soft-foreground text-sm">
                {warning.message}
              </p>
            ))}
          </Section>
          {dashboard.data.latestForecast ? (
            <ForecastResult
              key={dashboard.data.latestForecast.id}
              scope={scope}
              forecast={dashboard.data.latestForecast}
            />
          ) : (
            <NoRows title="Прогноз ещё не рассчитан" />
          )}
          <Section title="Ближайшие платежи и предупреждения">
            <div className="space-y-3">
              {dashboard.data.upcomingPayments.map((plan) => (
                <p key={plan.id}>
                  {plan.dueDate} · {plan.title} <Badge>{plan.overdue ? "Просрочен" : "Ожидается"}</Badge>
                </p>
              ))}
              {dashboard.data.activeAlerts.map((alert) => (
                <p key={alert.id}>{alert.title}</p>
              ))}
              {!dashboard.data.upcomingPayments.length && !dashboard.data.activeAlerts.length && (
                <p className="text-muted-foreground">Ближайших планов и активных предупреждений нет.</p>
              )}
            </div>
          </Section>
        </>
      )}
      {allowed && !activeJob && (
        <Section title="Рассчитать прогноз">
          <PostForm
            schema={forecastDraftSchema}
            defaults={{ asOfDate: businessDate(), scope: "WITH_KNOWN_PLANS" }}
            active={scope.active && !scope.busy}
            recovery={scope.recovery}
            label="Запустить прогноз"
            execute={(value, key) =>
              cashflowApi.startForecast(scope.company.id, scope.account.id, value, key)
            }
            onSuccess={(value) => {
              setJob(value);
              refresh();
            }}
          >
            {(form, disabled) => (
              <>
                <Controller
                  name="asOfDate"
                  control={form.control}
                  render={({ field }) => (
                    <Field
                      htmlFor="forecast-date"
                      label="Дата расчёта"
                      error={form.formState.errors.asOfDate?.message}
                    >
                      <DatePicker
                        id="forecast-date"
                        value={field.value}
                        onValueChange={(value) => field.onChange(value ?? "")}
                        disabled={disabled}
                      />
                    </Field>
                  )}
                />
                <Controller
                  name="scope"
                  control={form.control}
                  render={({ field }) => (
                    <RadioGroup
                      label="Какие данные учитывать"
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={disabled}
                      options={[
                        { value: "WITH_KNOWN_PLANS", label: "История и известные будущие платежи" },
                        { value: "HISTORY_ONLY", label: "Только история" },
                      ]}
                    />
                  )}
                />
              </>
            )}
          </PostForm>
        </Section>
      )}
      {running && (
        <JobStatus
          key={running.id}
          scope={{ ...scope, writable: scope.writable && !dashboard.isError }}
          initial={running}
          onFinished={finished}
        />
      )}
      {resultId && (
        <Section title="Сохранённый результат задания">
          <QueryState query={result} recovery={scope.recovery} />
          {visible(result) &&
            result.data &&
            (result.data.id === dashboard.data?.latestForecast?.id ? (
              <p>Этот результат показан в текущем обзоре выше.</p>
            ) : (
              <ForecastResult scope={scope} forecast={result.data} />
            ))}
        </Section>
      )}
    </div>
  );
}
export function OverviewPage() {
  return (
    <BusinessWorkspace
      title="Обзор и прогноз"
      description="Хватит ли денег на следующие 30 дней: история, планы, остаток и риск на одном экране."
    >
      {(scope) => <Overview scope={scope} />}
    </BusinessWorkspace>
  );
}

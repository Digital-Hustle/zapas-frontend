import { useCallback, useState } from "react";
import { useSearchParams } from "react-router";
import { Controller } from "react-hook-form";
import { Badge, Button, Checkbox, DatePicker, ErrorState, Field, Select } from "@zapas/ui";
import { BusinessWorkspace, type BusinessScope } from "@/widgets/business-workspace";
import {
  cashflowApi,
  useCashflow,
  backtestDraftSchema,
  businessDate,
  shiftDate,
  type Job,
  type BacktestDraft,
} from "@/entities/cashflow";
import { QualityDetails } from "@/widgets/forecast-insights";
import { PostForm } from "@/features/cashflow-actions";
import { accessDenied } from "@/shared/api/problem.ts";
import { scopeId } from "@/shared/lib/workspace-path.ts";
import { JobStatus, NoRows, QueryState, ReadOnly, Section } from "./parts.tsx";
import { useRefresh, visible } from "../model/helpers.ts";

function Result({ scope, id }: { scope: BusinessScope; id: string }) {
  const [page, setPage] = useState(0);
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "backtest",
    (signal) => cashflowApi.backtest(scope.company.id, scope.account.id, id, signal),
    scope.active,
    [id],
  );
  const origins = useCashflow(
    scope.company.id,
    scope.account.id,
    "origins",
    (signal) => cashflowApi.origins(scope.company.id, id, page, signal),
    scope.active && visible(query) && !query.isError,
    [id, page],
  );
  return (
    <Section title="Результат проверки">
      <QueryState query={query} recovery={scope.recovery} />
      {visible(query) && query.data && (
        <>
          <p className="text-muted-foreground text-sm">
            {query.data.scope === "HISTORY_ONLY"
              ? "Проверка только истории. Она не измеряет качество сегодняшних ручных планов."
              : query.data.scope === "WITH_KNOWN_PLANS"
                ? "Проверка с планами, известными на каждом историческом срезе."
                : "Режим этой проверки не распознан."}
          </p>
          <QualityDetails
            data={{ ...query.data, origins: visible(origins) ? (origins.data?.items ?? []) : [] }}
          />
          <QueryState query={origins} recovery={scope.recovery} />
          <div className="flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((value) => value - 1)}
            >
              Предыдущие срезы
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!origins.data?.page.hasNext}
              onClick={() => setPage((value) => value + 1)}
            >
              Следующие срезы
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}
function Quality({ scope }: { scope: BusinessScope }) {
  const [params, setParams] = useSearchParams();
  const selected = scopeId(params.get("result"));
  const select = (id: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set("result", id);
      return next;
    });
  const [page, setPage] = useState(0),
    [job, setJob] = useState<Job | null>(null);
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "backtests",
    (signal) => cashflowApi.backtests(scope.company.id, scope.account.id, page, signal),
    scope.active,
    [page],
  );
  const refresh = useRefresh(scope);
  const finished = useCallback(
    (value: Job) => {
      setJob(value);
      if (value.status === "SUCCEEDED" && value.resultId)
        setParams((current) => {
          const next = new URLSearchParams(current);
          next.set("result", value.resultId ?? "");
          return next;
        });
      refresh();
    },
    [refresh, setParams],
  );
  const activeJob = job?.status === "QUEUED" || job?.status === "RUNNING";
  const allowed = scope.writable && scope.company.permissions.canRunBacktest && !query.isError;
  const defaults: BacktestDraft = {
    firstOrigin: shiftDate(businessDate(), -120),
    lastOrigin: shiftDate(businessDate(), -30),
    stepDays: 7,
    scope: "HISTORY_ONLY",
    windowWeeks: 12,
    evaluateRisk: true,
  };
  return (
    <div className="space-y-6">
      <ReadOnly scope={scope} />
      {params.has("result") && !selected && (
        <ErrorState title="Некорректная ссылка на проверку" description="Выберите проверку из истории." />
      )}
      {allowed && !activeJob && (
        <Section title="Проверить прогноз на истории">
          <p className="text-muted-foreground text-sm">
            Каждый срез использует только данные, известные на его дату. После последнего среза нужны 30 дней
            факта. Единого процента точности нет.
          </p>
          <PostForm
            schema={backtestDraftSchema}
            defaults={defaults}
            active={!scope.busy}
            recovery={scope.recovery}
            label="Запустить проверку качества"
            execute={(value, key) =>
              cashflowApi.startBacktest(scope.company.id, scope.account.id, value, key)
            }
            onSuccess={(value) => setJob(value)}
          >
            {(form, disabled) => (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["firstOrigin", "lastOrigin"] as const).map((name) => (
                    <Controller
                      key={name}
                      name={name}
                      control={form.control}
                      render={({ field }) => (
                        <Field
                          htmlFor={`quality-${name}`}
                          label={
                            name === "firstOrigin"
                              ? "Первый исторический срез"
                              : "Последний исторический срез"
                          }
                          error={form.formState.errors[name]?.message}
                        >
                          <DatePicker
                            id={`quality-${name}`}
                            value={field.value}
                            onValueChange={(value) => field.onChange(value ?? "")}
                            disabled={disabled}
                          />
                        </Field>
                      )}
                    />
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    name="windowWeeks"
                    control={form.control}
                    render={({ field }) => (
                      <Field htmlFor="quality-window" label="Окно истории">
                        <Select
                          id="quality-window"
                          value={String(field.value)}
                          onValueChange={(value) => field.onChange(Number(value))}
                          disabled={disabled}
                          options={[8, 10, 12].map((value) => ({
                            value: String(value),
                            label: `${value} недель`,
                          }))}
                        />
                      </Field>
                    )}
                  />
                  <Controller
                    name="stepDays"
                    control={form.control}
                    render={({ field }) => (
                      <Field htmlFor="quality-step" label="Шаг между срезами">
                        <Select
                          id="quality-step"
                          value={String(field.value)}
                          onValueChange={(value) => field.onChange(Number(value))}
                          disabled={disabled}
                          options={[7, 14, 30].map((value) => ({
                            value: String(value),
                            label: `${value} дней`,
                          }))}
                        />
                      </Field>
                    )}
                  />
                </div>
                <Controller
                  name="scope"
                  control={form.control}
                  render={({ field }) => (
                    <Field htmlFor="quality-scope" label="Что проверять">
                      <Select
                        id="quality-scope"
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={disabled}
                        options={[
                          { value: "HISTORY_ONLY", label: "Только историю" },
                          { value: "WITH_KNOWN_PLANS", label: "Историю и планы, известные тогда" },
                        ]}
                      />
                    </Field>
                  )}
                />
                <Controller
                  name="evaluateRisk"
                  control={form.control}
                  render={({ field }) => (
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="quality-risk"
                        checked={field.value}
                        onCheckedChange={(value) => field.onChange(value === true)}
                        disabled={disabled}
                      />
                      <label htmlFor="quality-risk" className="text-sm">
                        Проверить также сценарную оценку риска
                      </label>
                    </div>
                  )}
                />
              </>
            )}
          </PostForm>
        </Section>
      )}
      {job && <JobStatus key={job.id} scope={scope} initial={job} onFinished={finished} />}
      <Section title="Качество прогноза">
        <Button size="sm" variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
          Обновить проверки
        </Button>
        <QueryState query={query} recovery={scope.recovery} />
        {visible(query) && query.data && (
          <>
            {query.data.items.length === 0 ? (
              <NoRows title="Качество ещё не проверено" />
            ) : (
              query.data.items.map((item) => (
                <div key={item.id} className="border-border space-y-3 rounded-md border p-4">
                  <p>
                    {item.firstOrigin} — {item.lastOrigin}
                  </p>
                  <Badge>
                    {item.status === "COMPLETE"
                      ? "Завершено"
                      : item.status === "PARTIAL"
                        ? "Частичная проверка"
                        : "Неизвестное состояние проверки"}
                  </Badge>
                  <p className="text-muted-foreground text-sm">
                    Проверено срезов: {item.evaluatedOrigins} · Пропущено: {item.skippedOrigins}
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => select(item.id)}>
                    Открыть проверку
                  </Button>
                </div>
              ))
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage((value) => value - 1)}
              >
                Предыдущая страница
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!query.data.page.hasNext}
                onClick={() => setPage((value) => value + 1)}
              >
                Следующая страница
              </Button>
            </div>
          </>
        )}
      </Section>
      {selected && !(query.isError && accessDenied(query.error)) && (
        <Result key={selected} scope={scope} id={selected} />
      )}
    </div>
  );
}
export function QualityPage() {
  return (
    <BusinessWorkspace
      title="Качество прогноза"
      description="Историческая проверка: ошибка в рублях, найденные разрывы, пропуски и ограничения сценарной оценки."
    >
      {(scope) => <Quality scope={scope} />}
    </BusinessWorkspace>
  );
}

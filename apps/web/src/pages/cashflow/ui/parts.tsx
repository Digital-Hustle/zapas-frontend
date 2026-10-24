import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router";
import { Amount, Badge, Button, EmptyState, buttonVariants } from "@zapas/ui";
import { cashflowApi, type Job } from "@/entities/cashflow";
import { useCalculation } from "@/features/watch-calculation";
import { PostForm } from "@/features/cashflow-actions";
import type { BusinessScope } from "@/widgets/business-workspace";
import { Loading, QueryIssue } from "@/shared/ui/BusinessData.tsx";
import { accessDenied } from "@/shared/api/problem.ts";
import { accountPath } from "@/shared/lib/workspace-path.ts";
import { z } from "zod";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-border bg-card min-w-0 space-y-4 rounded-lg border p-5 sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
export function QueryState({
  query,
  recovery,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    isFetching: boolean;
    error: unknown;
    data: unknown;
    refetch: () => Promise<unknown>;
  };
  recovery: ReactNode;
}) {
  return (
    <>
      {query.isPending && <Loading label="Загрузка данных" />}
      {query.isError && (
        <QueryIssue
          error={query.error}
          saved={Boolean(query.data) && !accessDenied(query.error)}
          pending={query.isFetching}
          onRetry={() => void query.refetch()}
          recovery={recovery}
        />
      )}
    </>
  );
}
export function MoneyMetric({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="border-border min-w-0 rounded-md border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      {value === null ? (
        <p className="mt-2 text-sm">Нет данных</p>
      ) : (
        <Amount value={value} animated={false} className="mt-2 block text-xl font-semibold break-words" />
      )}
    </div>
  );
}
const statusNames: Record<string, string> = {
  QUEUED: "В очереди",
  RUNNING: "Выполняется",
  SUCCEEDED: "Завершён",
  FAILED: "Ошибка расчёта",
  CANCELLED: "Отменён",
  UNKNOWN: "Неизвестное состояние",
};
export function JobStatus({
  scope,
  initial,
  onFinished,
}: {
  scope: BusinessScope;
  initial: Job;
  onFinished: (job: Job) => void;
}) {
  const query = useCalculation(
    { companyId: scope.company.id, accountId: scope.account.id, jobId: initial.id },
    (value, signal) => cashflowApi.job(value.companyId, value.accountId, value.jobId, signal),
    scope.active,
  );
  const handled = useRef<string | null>(null);
  const current = query.data ?? initial;
  useEffect(() => {
    if (
      !scope.active ||
      query.isError ||
      !query.data ||
      !["SUCCEEDED", "FAILED", "CANCELLED"].includes(query.data.status) ||
      handled.current === query.data.id
    )
      return;
    handled.current = query.data.id;
    onFinished({ ...initial, ...query.data });
  }, [scope.active, query.data, query.isError, initial, onFinished]);
  if (query.isError && accessDenied(query.error))
    return <QueryState query={query} recovery={scope.recovery} />;
  return (
    <Section title="Состояние задания">
      <p role="status">{statusNames[current.status] ?? statusNames.UNKNOWN}</p>
      {current.status === "RUNNING" && (
        <p className="text-muted-foreground text-sm">Прогресс: {current.progress}%</p>
      )}
      {current.error && (
        <p role="alert" className="text-danger">
          {current.error.detail}
        </p>
      )}
      {query.isError && <QueryState query={query} recovery={scope.recovery} />}
      {current.status === "SUCCEEDED" &&
        !current.resultId &&
        ["FORECAST", "BACKTEST"].includes(initial.type) && (
          <p role="alert">Ссылка на результат отсутствует. Обновите статус.</p>
        )}
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          variant="secondary"
          loading={query.isFetching}
          disabled={!scope.active}
          onClick={() => void query.refetch()}
        >
          Обновить статус
        </Button>
        {current.status === "SUCCEEDED" &&
          current.resultId &&
          ["FORECAST", "BACKTEST"].includes(initial.type) && (
            <Link
              className={buttonVariants({ size: "sm", variant: "secondary" })}
              to={`${accountPath(initial.type === "BACKTEST" ? "quality" : "overview", scope.company.id, scope.account.id)}&result=${current.resultId}`}
            >
              Открыть результат
            </Link>
          )}
      </div>
      {scope.writable &&
        (initial.type === "FORECAST"
          ? scope.company.permissions.canRunForecast
          : initial.type === "BACKTEST"
            ? scope.company.permissions.canRunBacktest
            : initial.type === "DETECT_RECURRING" && scope.company.permissions.canManagePlans) &&
        current.status === "QUEUED" && (
          <PostForm
            schema={z.object({}).strict()}
            defaults={{}}
            active={scope.active && !query.isError}
            recovery={scope.recovery}
            label="Отменить задание"
            execute={(_value, key) =>
              cashflowApi.cancelJob(scope.company.id, scope.account.id, initial.id, key)
            }
            onSuccess={() => void query.refetch()}
          >
            {() => null}
          </PostForm>
        )}
    </Section>
  );
}
export function ReadOnly({ scope }: { scope: BusinessScope }) {
  return !scope.writable ? (
    <p role="status" className="text-muted-foreground text-sm">
      Доступен просмотр. Изменения требуют прав владельца или бухгалтера и доступного сервера.
    </p>
  ) : null;
}
export function NoRows({
  filtered = false,
  title = "Данных пока нет",
}: {
  filtered?: boolean;
  title?: string;
}) {
  return (
    <EmptyState
      filtered={filtered}
      title={title}
      description={
        filtered
          ? "Измените фильтр или вернитесь ко всем данным."
          : "Добавьте данные или загрузите выписку для выбранного счёта."
      }
    />
  );
}
export function StatusBadge({ label }: { label: string }) {
  return <Badge>{label}</Badge>;
}

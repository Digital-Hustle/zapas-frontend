import { useId, useRef, useState, type ReactNode } from "react";
import { Button, notify } from "@zapas/ui";
import type { Calculation } from "../model/types.ts";

export interface CalculationPanelProps {
  job: Calculation | null;
  canRun: boolean;
  offline: boolean;
  stale: boolean;
  onStart: () => Promise<void>;
  onRefresh: () => Promise<unknown>;
  previousResult?: ReactNode;
  readError?: string | null;
  onCancel?: () => Promise<void>;
}

const labels: Record<string, string> = {
  QUEUED: "В очереди",
  RUNNING: "Выполняется",
  SUCCEEDED: "Расчёт завершён",
  FAILED: "Расчёт завершился ошибкой",
  CANCELLED: "Расчёт отменён",
};

export function CalculationPanel({
  job,
  canRun,
  offline,
  stale,
  onStart,
  onRefresh,
  previousResult,
  readError,
  onCancel,
}: CalculationPanelProps) {
  const id = useId();
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const active = job?.status === "QUEUED" || job?.status === "RUNNING";
  const label = job && Object.hasOwn(labels, job.status) ? labels[job.status] : undefined;
  const unknown = job !== null && !label;
  const run = async (action: () => Promise<unknown>) => {
    if (locked.current || offline) return;
    locked.current = true;
    setPending(true);
    setActionError(null);
    try {
      await action();
    } catch {
      const message = "Не удалось выполнить действие. Проверьте статус перед повторным запуском.";
      setActionError(message);
      notify.error(message);
    } finally {
      locked.current = false;
      setPending(false);
    }
  };
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section aria-labelledby={id} className="border-border bg-card rounded-lg border p-5">
        <h2 id={id} className="text-xl font-semibold">
          Состояние расчёта
        </h2>
        <p role="status" className="mt-3 font-medium">
          {job === null ? "Расчёт ещё не запускался" : (label ?? "Неизвестное состояние расчёта")}
        </p>
        {active &&
          job.progress !== null &&
          Number.isFinite(job.progress) &&
          job.progress >= 0 &&
          job.progress <= 100 && (
            <p className="text-muted-foreground mt-2 text-sm">Выполнено: {job.progress}%</p>
          )}
        {job?.status === "SUCCEEDED" && (
          <p className="text-muted-foreground mt-2 text-sm">
            {job.resultId
              ? "Результат готов к загрузке."
              : "Ссылка на результат отсутствует. Обновите статус."}
          </p>
        )}
        {job?.error && (
          <div role="alert" className="text-danger mt-3">
            <p>{job.error.detail}</p>
            {job.error.traceId && (
              <p className="mt-2 text-sm break-all">Код обращения: {job.error.traceId}</p>
            )}
          </div>
        )}
        {offline && (
          <p className="text-warning-soft-foreground mt-3">
            Нет соединения. Сохранённые данные остаются на экране; действия доступны после восстановления
            сети.
          </p>
        )}
        {readError && (
          <p role="alert" className="text-danger mt-3">
            {readError} Автоматическое обновление остановлено. Проверьте соединение и обновите статус.
          </p>
        )}
        {actionError && (
          <p role="alert" className="text-danger mt-3">
            {actionError}
          </p>
        )}
        {stale && (
          <p className="text-warning-soft-foreground mt-3">
            Результат устарел. Сохранённый прогноз показан отдельно от текущего расчёта.
          </p>
        )}
        {previousResult && (
          <p className="text-muted-foreground mt-3 text-sm">
            Пока новый результат не загружен, доступен сохранённый результат.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {canRun && !active && !unknown && (
            <Button
              loading={pending}
              disabled={offline || Boolean(readError)}
              onClick={() => void run(onStart)}
            >
              {job === null ? "Запустить расчёт" : "Запустить новый расчёт"}
            </Button>
          )}
          {job && (
            <Button variant="secondary" disabled={offline || pending} onClick={() => void run(onRefresh)}>
              Обновить статус
            </Button>
          )}
          {canRun && onCancel && job?.status === "QUEUED" && (
            <Button variant="ghost" disabled={offline || pending} onClick={() => void run(onCancel)}>
              Отменить задание
            </Button>
          )}
        </div>
        {!canRun && (
          <p className="text-muted-foreground mt-3 text-sm">Запуск расчёта недоступен для этого счёта.</p>
        )}
      </section>
      {previousResult && <section aria-label="Сохранённый результат">{previousResult}</section>}
    </div>
  );
}

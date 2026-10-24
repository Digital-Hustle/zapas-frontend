import { useRef, useState } from "react";
import { Link } from "react-router";
import { Checkbox, Field, Select, buttonVariants } from "@zapas/ui";
import { Logo } from "@/shared/ui";
import { CalculationPanel } from "./ui/CalculationPanel.tsx";
import type { Calculation } from "./model/types.ts";

export function CalculationPreview() {
  const [status, setStatus] = useState("FAILED");
  const [offline, setOffline] = useState(false);
  const [readonly, setReadonly] = useState(false);
  const [readError, setReadError] = useState(false);
  const [starts, setStarts] = useState(0);
  const counter = useRef(0);
  const job: Calculation | null =
    status === "EMPTY"
      ? null
      : {
          id: "example-job",
          status,
          createdAt: "2026-10-24T00:00:00Z",
          progress: 35,
          resultId: status === "SUCCEEDED" ? "example-result" : null,
          error:
            status === "FAILED"
              ? { detail: "Недостаточно подтверждённой истории для расчёта", traceId: "example-trace" }
              : null,
        };
  const start = async () => {
    counter.current += 1;
    setStarts(counter.current);
    await new Promise((resolve) => setTimeout(resolve, 200));
    setStatus("QUEUED");
  };
  return (
    <div className="bg-background min-h-svh">
      <header className="border-border border-b">
        <div className="max-w-content mx-auto flex items-center justify-between gap-4 p-6">
          <Logo />
          <Link to="/" className={buttonVariants({ size: "sm", variant: "ghost" })}>
            На главную
          </Link>
        </div>
      </header>
      <main className="max-w-content mx-auto flex flex-col gap-8 px-6 py-8">
        <div>
          <p className="bg-primary-soft text-primary-soft-foreground w-fit rounded-full px-3 py-1 text-sm">
            Смоделированный пример
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Состояния расчёта — витрина v1</h1>
          <p className="text-muted-foreground mt-3">
            Только для разработки. Ответы фиксированы, API не вызывается. Polling проверяется отдельно через
            внедряемый loader.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="max-w-sm grow">
            <Field label="Состояние задания" htmlFor="job-case">
              <Select
                id="job-case"
                value={status}
                onValueChange={setStatus}
                options={[
                  { value: "EMPTY", label: "Не запускался" },
                  { value: "QUEUED", label: "В очереди" },
                  { value: "RUNNING", label: "Выполняется" },
                  { value: "FAILED", label: "Ошибка" },
                  { value: "CANCELLED", label: "Отменён" },
                  { value: "SUCCEEDED", label: "Завершён" },
                  { value: "UNKNOWN", label: "Неизвестное состояние" },
                ]}
              />
            </Field>
          </div>
          <label htmlFor="offline-case" className="flex items-center gap-2 text-sm">
            <Checkbox id="offline-case" checked={offline} onCheckedChange={(v) => setOffline(v === true)} />
            Нет сети
          </label>
          <label htmlFor="readonly-case" className="flex items-center gap-2 text-sm">
            <Checkbox
              id="readonly-case"
              checked={readonly}
              onCheckedChange={(v) => setReadonly(v === true)}
            />
            Только просмотр
          </label>
          <label htmlFor="read-error-case" className="flex items-center gap-2 text-sm">
            <Checkbox
              id="read-error-case"
              checked={readError}
              onCheckedChange={(v) => setReadError(v === true)}
            />
            Ошибка обновления
          </label>
        </div>
        <CalculationPanel
          job={job}
          canRun={!readonly}
          offline={offline}
          stale
          readError={readError ? "Сервер временно недоступен." : null}
          onStart={start}
          onRefresh={() => {
            setReadError(false);
            return Promise.resolve();
          }}
          onCancel={() => {
            setStatus("CANCELLED");
            return Promise.resolve();
          }}
          previousResult={
            <div className="border-border bg-card rounded-lg border p-5">
              <h2 className="text-xl font-semibold">Сохранённый прогноз</h2>
              <p className="text-muted-foreground mt-3">
                По состоянию на 23 октября. Остаток на горизонте: 25 000,00 ₽.
              </p>
            </div>
          }
        />
        <p className="text-muted-foreground text-sm" role="status">
          Заявок отправлено: {starts}
        </p>
      </main>
    </div>
  );
}

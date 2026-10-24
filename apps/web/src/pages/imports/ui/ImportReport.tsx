import { useState, type ReactNode } from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, EmptyState } from "@zapas/ui";
import { usePrivateQueries } from "@/entities/auth-profile";
import { useImportReport, useImportIssues, importKeys, type StatementImport } from "@/entities/imports";
import { accessDenied } from "@/shared/api/problem.ts";
import { Loading, Pagination, QueryIssue } from "@/shared/ui/BusinessData.tsx";

const status = {
  COMMITTED: "Импорт завершён",
  REJECTED: "Импорт отклонён",
  ABORTED: "Импорт прерван",
  RECEIVING: "Файл принимается",
  STAGING: "Идёт обработка",
  UNKNOWN: "Статус не распознан",
} as const;
export function ImportSummary({ value }: { value: StatementImport }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-semibold break-all">{value.fileName}</h3>
        <Badge
          tone={
            value.status === "COMMITTED"
              ? "success"
              : value.status === "REJECTED" || value.status === "ABORTED"
                ? "danger"
                : "warning"
          }
        >
          {status[value.status]}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
        {(
          [
            ["Всего строк", value.total],
            ["Принято", value.accepted],
            ["Отклонено", value.rejected],
            ["Дубликаты", value.duplicates],
            ["Предупреждения", value.warnings],
          ] as const
        ).map(([label, count]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-semibold tabular-nums">{count}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-sm">
        Период строк: {value.fromDate ?? "не определён"} — {value.toDate ?? "не определён"}. Это не
        подтверждение полноты выписки.
      </p>
      {value.status === "REJECTED" && (
        <p className="text-danger text-sm">
          Импорт не опубликован. Проверьте ошибки и исходный файл перед новой попыткой.
        </p>
      )}
      {value.status === "ABORTED" && (
        <p className="text-muted-foreground text-sm">
          Прерванный импорт не меняет операции. Новая попытка отправляется отдельной командой.
        </p>
      )}
      {value.status === "COMMITTED" && value.rejected > 0 && (
        <p className="text-warning-soft-foreground text-sm">
          Сохранены корректные строки. Ошибочные строки не добавлены; проверьте отчёт. Полнота не
          подтверждается автоматически.
        </p>
      )}
      {(value.status === "RECEIVING" || value.status === "STAGING") && (
        <p role="status" className="text-muted-foreground text-sm">
          Операция ещё не завершена. Перечитайте статус перед повторной загрузкой.
        </p>
      )}
      {value.status === "UNKNOWN" && (
        <p role="status" className="text-muted-foreground text-sm">
          Не удалось определить результат импорта. Обновите статус перед новой загрузкой.
        </p>
      )}
    </div>
  );
}
export function ImportReport({
  companyId,
  accountId,
  importId,
  recovery,
}: {
  companyId: string;
  accountId: string;
  importId: string;
  recovery: ReactNode;
}) {
  const { privateQueries } = usePrivateQueries();
  const client = useQueryClient();
  const report = useImportReport(companyId, accountId, importId, privateQueries);
  const [page, setPage] = useState(0);
  const allowed = privateQueries && Boolean(report.data) && !(report.isError && accessDenied(report.error));
  const issues = useImportIssues(
    companyId,
    accountId,
    importId,
    page,
    allowed && !report.isError && !report.isFetching,
  );
  const busy = useIsMutating() > 0;
  return (
    <section
      aria-labelledby="import-report"
      className="border-border bg-card space-y-5 rounded-lg border p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="import-report" className="text-xl font-semibold">
          Отчёт импорта
        </h2>
        <Button
          variant="secondary"
          size="sm"
          loading={report.isFetching || issues.isFetching}
          disabled={busy}
          onClick={async () => {
            if (privateQueries) {
              const fresh = await report.refetch();
              if (!fresh.isError)
                void client.invalidateQueries({
                  queryKey: [...importKeys.report(companyId, accountId, importId), "issues"],
                });
            }
          }}
        >
          Обновить отчёт
        </Button>
      </div>
      {report.isPending && <Loading label="Загрузка отчёта импорта" />}
      {report.isError && (
        <QueryIssue
          error={report.error}
          saved={Boolean(report.data) && !accessDenied(report.error)}
          pending={report.isFetching}
          onRetry={() => void report.refetch()}
          recovery={recovery}
        />
      )}
      {report.data && allowed && (
        <>
          <ImportSummary value={report.data} />
          <h3 className="text-lg font-semibold">Замечания по строкам</h3>
          {issues.isPending && !report.isError && <Loading label="Загрузка замечаний импорта" />}
          {report.isError && !issues.data && (
            <p className="text-muted-foreground text-sm">Перечитайте отчёт, чтобы загрузить замечания.</p>
          )}
          {issues.isError && !report.isError && (
            <QueryIssue
              error={issues.error}
              saved={Boolean(issues.data) && !accessDenied(issues.error)}
              pending={issues.isFetching}
              onRetry={() => void issues.refetch()}
              recovery={recovery}
            />
          )}
          {issues.data && !(issues.isError && accessDenied(issues.error)) && (
            <>
              {issues.data.items.length === 0 ? (
                <EmptyState
                  title="На этой странице нет замечаний"
                  description="Итоговые количества строк указаны в отчёте выше."
                />
              ) : (
                <ul className="space-y-3">
                  {issues.data.items.map((issue) => (
                    <li key={issue.id} className="border-border space-y-2 rounded-md border p-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          tone={
                            issue.severity === "ERROR"
                              ? "danger"
                              : issue.severity === "INFO"
                                ? "neutral"
                                : "warning"
                          }
                        >
                          {issue.severity === "ERROR"
                            ? "Ошибка"
                            : issue.severity === "INFO"
                              ? "Информация"
                              : issue.severity === "WARNING"
                                ? "Предупреждение"
                                : "Замечание"}
                        </Badge>
                        <span className="break-all">{issue.code}</span>
                      </div>
                      <p className="text-muted-foreground break-words">
                        {issue.rowNumber === null ? "Без номера строки" : `Строка ${issue.rowNumber}`}
                        {issue.field ? ` · ${issue.field}` : ""}
                      </p>
                      <p className="break-words">{issue.message}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Pagination page={issues.data.page} pending={issues.isFetching || busy} onChange={setPage} />
            </>
          )}
        </>
      )}
    </section>
  );
}

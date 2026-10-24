import { useCallback, useState } from "react";
import { Button } from "@zapas/ui";
import { cashflowApi, useCashflow, type Job } from "@/entities/cashflow";
import { BusinessWorkspace, type BusinessScope } from "@/widgets/business-workspace";
import { JobStatus, NoRows, QueryState, Section } from "./parts.tsx";
import { accessDenied } from "@/shared/api/problem.ts";
import { statusNames } from "../model/labels.ts";
import { useRefresh, visible } from "../model/helpers.ts";

function Jobs({ scope }: { scope: BusinessScope }) {
  const [page, setPage] = useState(0),
    [selected, setSelected] = useState<Job | null>(null);
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "jobs",
    (signal) => cashflowApi.jobs(scope.company.id, scope.account.id, page, signal),
    scope.active,
    [page],
  );
  const refresh = useRefresh(scope);
  const finished = useCallback(
    (value: Job) => {
      setSelected(value);
      refresh();
    },
    [refresh],
  );
  return (
    <div className="space-y-6">
      <Section title="Задания выбранного счёта">
        <Button variant="secondary" size="sm" loading={query.isFetching} onClick={() => void query.refetch()}>
          Обновить задания
        </Button>
        <QueryState query={query} recovery={scope.recovery} />
        {visible(query) && query.data && (
          <>
            {query.data.items.length === 0 ? (
              <NoRows title="Расчёты ещё не запускались" />
            ) : (
              query.data.items.map((item) => (
                <div key={item.id} className="border-border space-y-3 rounded-md border p-4">
                  <p>
                    {item.type === "FORECAST"
                      ? "Прогноз"
                      : item.type === "BACKTEST"
                        ? "Проверка качества"
                        : item.type === "DETECT_RECURRING"
                          ? "Поиск регулярностей"
                          : "Неизвестное задание"}{" "}
                    · {statusNames[item.status] ?? statusNames.UNKNOWN}
                  </p>
                  <p className="text-muted-foreground text-sm">Создано: {item.createdAt}</p>
                  <Button variant="secondary" size="sm" onClick={() => setSelected(item)}>
                    Открыть задание
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
        <JobStatus
          key={selected.id}
          scope={{ ...scope, writable: scope.writable && !query.isError }}
          initial={selected}
          onFinished={finished}
        />
      )}
    </div>
  );
}
export function JobsPage() {
  return (
    <BusinessWorkspace
      title="Расчёты"
      description="Состояния прогнозов, проверок качества и поиска регулярностей. Старый результат не исчезает во время нового задания."
    >
      {(scope) => <Jobs scope={scope} />}
    </BusinessWorkspace>
  );
}

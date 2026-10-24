import { useState } from "react";
import { Link } from "react-router";
import { z } from "zod";
import { Badge, Button, Select, Field } from "@zapas/ui";
import { cashflowApi, useCashflow, versionSchema, type Alert } from "@/entities/cashflow";
import { BusinessWorkspace, type BusinessScope } from "@/widgets/business-workspace";
import { PostForm } from "@/features/cashflow-actions";
import { accountPath } from "@/shared/lib/workspace-path.ts";
import { MoneyMetric, NoRows, QueryState, ReadOnly, Section } from "./parts.tsx";
import { useRefresh, visible } from "../model/helpers.ts";

function AlertCard({ scope, value, refresh }: { scope: BusinessScope; value: Alert; refresh: () => void }) {
  return (
    <div className="border-border bg-card space-y-3 rounded-lg border p-5">
      <h2 className="text-lg font-semibold break-words">{value.title}</h2>
      <p className="text-muted-foreground">{value.description}</p>
      <div className="flex flex-wrap gap-2">
        <Badge>{value.active ? "Активно" : "Историческое"}</Badge>
        {value.acknowledgedAt && <Badge tone="success">Просмотрено</Badge>}
      </div>
      {value.date && <p>{value.date}</p>}
      {value.forecastId && (
        <p className="text-muted-foreground text-sm">
          Вероятность риска:{" "}
          {value.probability === null
            ? "не предоставлена"
            : new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 }).format(
                value.probability,
              )}
        </p>
      )}
      {value.shortfall !== null && <MoneyMetric label="Возможная нехватка" value={value.shortfall} />}
      {value.forecastId && (
        <Link
          to={`${accountPath("overview", scope.company.id, scope.account.id)}&result=${value.forecastId}${value.gapId ? `&gap=${value.gapId}` : ""}`}
          className="text-link text-sm underline"
        >
          Открыть прогноз и факторы
        </Link>
      )}
      {value.expectedPaymentId && (
        <Link
          to={`${accountPath("plans", scope.company.id, scope.account.id)}&plan=${value.expectedPaymentId}`}
          className="text-link text-sm underline"
        >
          Открыть будущий платёж
        </Link>
      )}
      {scope.writable && !value.acknowledgedAt && (
        <PostForm
          schema={z.object({ version: versionSchema })}
          defaults={{ version: value.version }}
          active={scope.active && !scope.busy}
          label="Отметить просмотренным"
          recovery={scope.recovery}
          execute={(draft, key) =>
            cashflowApi.acknowledge(scope.company.id, scope.account.id, value.id, draft.version, key)
          }
          versionRead={{
            queryKey: ["alert-version", scope.company.id, scope.account.id, value.id],
            read: async (signal) => {
              let number = 0;
              for (;;) {
                const rows = await cashflowApi.alerts(
                  scope.company.id,
                  scope.account.id,
                  number,
                  null,
                  signal,
                );
                const found = rows.items.find((item) => item.id === value.id);
                if (found) return found;
                if (!rows.page.hasNext) throw new Error("Предупреждение не найдено");
                number += 1;
              }
            },
          }}
          onSuccess={refresh}
        >
          {() => (
            <p className="text-muted-foreground text-sm">
              Отметка просмотра не убирает действующую причину риска.
            </p>
          )}
        </PostForm>
      )}
    </div>
  );
}
function Alerts({ scope }: { scope: BusinessScope }) {
  const [page, setPage] = useState(0),
    [active, setActive] = useState(true);
  const query = useCashflow(
    scope.company.id,
    scope.account.id,
    "alerts",
    (signal) => cashflowApi.alerts(scope.company.id, scope.account.id, page, active, signal),
    scope.active,
    [page, active],
  );
  const refresh = useRefresh(scope);
  return (
    <Section title="Предупреждения счёта">
      <ReadOnly scope={scope} />
      <div className="flex flex-wrap items-end gap-4">
        <Field htmlFor="alert-filter" label="Показать">
          <Select
            id="alert-filter"
            value={active ? "active" : "history"}
            onValueChange={(value) => {
              setActive(value === "active");
              setPage(0);
            }}
            options={[
              { value: "active", label: "Активные причины" },
              { value: "history", label: "Исторические предупреждения" },
            ]}
          />
        </Field>
        <Button size="sm" variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>
          Обновить предупреждения
        </Button>
      </div>
      <QueryState query={query} recovery={scope.recovery} />
      {visible(query) && query.data && (
        <>
          {query.data.items.length === 0 ? (
            <NoRows title="Предупреждений нет" />
          ) : (
            query.data.items.map((item) => (
              <AlertCard
                key={`${item.id}/${item.version}`}
                scope={{ ...scope, writable: scope.writable && !query.isError }}
                value={item}
                refresh={refresh}
              />
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
  );
}
export function AlertsPage() {
  return (
    <BusinessWorkspace
      title="Предупреждения"
      description="Актуальность риска и отметка просмотра — разные состояния. История предупреждений сохраняется."
    >
      {(scope) => <Alerts scope={scope} />}
    </BusinessWorkspace>
  );
}

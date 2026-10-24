import { useId } from "react";
import { formatDate } from "@zapas/ui";
import type { RiskDetailsModel } from "../model/types.ts";
import { moneyText, probabilityText } from "../model/format.ts";
import { Metric } from "./Metric.tsx";

export function RiskDetails({ data }: { data: RiskDetailsModel }) {
  const id = useId();
  const available = data.availability === "AVAILABLE";
  const reason =
    data.availability === "INSUFFICIENT_HISTORY"
      ? "Недостаточно истории для вероятности"
      : data.availability === "INPUT_INCOMPLETE"
        ? "История неполна — вероятность недоступна"
        : "Оценка вероятности недоступна";
  const title =
    data.kind === "CASH_GAP"
      ? "Кассовый разрыв"
      : data.kind === "BUFFER_BREACH"
        ? "Остаток ниже буфера"
        : "Риск остатка";
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-6">
      <div>
        <p className="text-danger text-sm font-medium">
          {formatDate(data.from)} — {formatDate(data.to)}
        </p>
        <h2 id={id} className="mt-2 text-2xl font-semibold">
          {title}
        </h2>
        <p className="text-muted-foreground mt-2">
          Суммы и даты переданы расчётом сервера. Это ожидаемый риск, а не совершённый платёж.
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Минимальный ожидаемый остаток" value={moneyText(data.minimumBalance, "Нет данных")} />
        <Metric label="Ожидаемый дефицит" value={moneyText(data.shortfall, "Нет данных")} />
        <Metric label="Порог эпизода" value={moneyText(data.threshold, "Нет данных")} />
        <Metric
          label="Сценарная вероятность эпизода"
          value={available ? probabilityText(data.probability) : reason}
          note="Сценарная оценка по истории — не показатель точности прогноза."
        />
        <Metric label="Сценарии / исторические срезы" value={`${data.scenarioCount} / ${data.originCount}`} />
      </dl>
      <div className="border-border bg-muted rounded-lg border p-4">
        <h3 className="font-semibold">Дефицит при наступлении эпизода</h3>
        <p className="text-muted-foreground mt-2 text-sm">
          Условная оценка суммы только среди сценариев с нарушением порога.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Metric
            label="Дефицит P50"
            value={moneyText(available ? data.shortfallP50 : null, "Недостаточно сценариев для оценки суммы")}
          />
          <Metric
            label="Дефицит P90"
            value={moneyText(available ? data.shortfallP90 : null, "Недостаточно сценариев для оценки суммы")}
          />
        </dl>
      </div>
      {data.assumptions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Ограничения оценки</h3>
          <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5">
            {data.assumptions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold">Факторы риска</h3>
        {data.factors.length === 0 ? (
          <p className="text-muted-foreground mt-3">Факторы не переданы.</p>
        ) : (
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">
            {data.factors.map((factor, i) => (
              <li key={i} className="border-border bg-card rounded-lg border p-5">
                <h4 className="font-semibold">{factor.title}</h4>
                <p className="text-muted-foreground mt-2 text-sm">{factor.description}</p>
                {factor.amount !== null && (
                  <p className="mt-3 tabular-nums">{moneyText(factor.amount, "Нет данных")}</p>
                )}
                {factor.date !== null && (
                  <p className="text-muted-foreground mt-1 text-sm">{formatDate(factor.date)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold">Возможные действия</h3>
        <p className="text-muted-foreground mt-2 text-sm">
          Рекомендация не означает согласованный или разрешённый перенос платежа.
        </p>
        {data.actions.length === 0 ? (
          <p className="text-muted-foreground mt-3">Рекомендации не переданы.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.actions.map((action, i) => (
              <li key={i} className="border-border rounded-lg border p-5">
                <h4 className="font-semibold">{action.title}</h4>
                <p className="text-muted-foreground mt-2">{action.description}</p>
                {action.requiresAgreement && (
                  <p className="text-warning-soft-foreground mt-3 text-sm font-medium">
                    Требует вашего согласования
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

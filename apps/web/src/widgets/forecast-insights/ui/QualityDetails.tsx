import { useId } from "react";
import { formatDate } from "@zapas/ui";
import type { QualityDetailsModel } from "../model/types.ts";
import { decimalText, moneyText, probabilityText } from "../model/format.ts";
import { Metric } from "./Metric.tsx";

export function QualityDetails({ data }: { data: QualityDetailsModel | null }) {
  const id = useId();
  if (data === null)
    return (
      <section aria-labelledby={id}>
        <h2 id={id} className="text-2xl font-semibold">
          Качество ещё не проверено
        </h2>
        <p className="text-muted-foreground mt-3">
          Запустите проверку на истории, когда данные и исходные остатки готовы.
        </p>
      </section>
    );
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-6">
      <div>
        <h2 id={id} className="text-2xl font-semibold">
          Качество прогноза на истории
        </h2>
        <p className="text-muted-foreground mt-2">
          Отсечки {formatDate(data.firstOrigin)} — {formatDate(data.lastOrigin)}. Горизонт каждой проверки —
          30 дней.
        </p>
        <p className="text-muted-foreground mt-2 text-sm break-words">
          Окно: {data.windowWeeks} недель · Версия: {data.algorithmVersion}
        </p>
        <p className="mt-3 font-medium">
          {data.status === "COMPLETE"
            ? "Проверка завершена"
            : data.status === "PARTIAL"
              ? "Частичная проверка"
              : data.status === "FAILED"
                ? "Проверка не завершена"
                : "Неизвестное состояние проверки"}
        </p>
        {data.stale && (
          <p className="text-warning-soft-foreground mt-2">
            Результат устарел: исходные данные изменились. Показан сохранённый результат.
          </p>
        )}
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="MAE остатка" value={moneyText(data.mae)} note="Средняя абсолютная ошибка, рубли" />
        <Metric label="RMSE остатка" value={moneyText(data.rmse)} note="Среднеквадратичная ошибка, рубли" />
        <Metric label="Проверено срезов" value={String(data.evaluatedOrigins)} />
        <Metric label="Пропущено срезов" value={String(data.skippedOrigins)} />
        <Metric label="Проверено дней" value={String(data.evaluatedDays)} />
      </dl>
      <div>
        <h3 className="text-lg font-semibold">Ошибка по горизонту</h3>
        {data.horizons.length === 0 ? (
          <p className="text-muted-foreground mt-3">Метрики по горизонтам не переданы.</p>
        ) : (
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            {data.horizons.map((metric) => (
              <Metric
                key={metric.day}
                label={`Горизонт ${metric.day} дн.`}
                value={`MAE: ${moneyText(metric.mae)}`}
                note={`RMSE: ${moneyText(metric.rmse)} · Наблюдений: ${metric.count}`}
              />
            ))}
          </dl>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold">Предупреждения о разрывах</h3>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label="Precision"
            value={probabilityText(data.precision)}
            note="Доля верных среди предсказанных эпизодов"
          />
          <Metric
            label="Recall"
            value={probabilityText(data.recall)}
            note="Доля найденных среди фактических эпизодов"
          />
          <Metric label="Заблаговременность, медиана" value={decimalText(data.leadDays, " дней")} />
          <Metric label="Ошибка даты, MAE" value={decimalText(data.dateMaeDays, " дней")} />
          <Metric label="Ошибка суммы дефицита, MAE" value={moneyText(data.shortfallMae)} />
        </dl>
        <p className="text-muted-foreground mt-3 text-sm">
          Верные предупреждения: {data.truePositive}. Ложные: {data.falsePositive}. Пропущенные разрывы:{" "}
          {data.falseNegative}.
        </p>
      </div>
      <div>
        <h3 className="text-lg font-semibold">Проверка сценарной оценки риска</h3>
        <p className="text-muted-foreground mt-2">
          Вероятность разрыва и качество прогноза — разные показатели. Единого процента точности нет.
        </p>
        <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label="Brier score"
            value={decimalText(data.brier)}
            note="Ошибка вероятностной оценки, не процент"
          />
          <Metric label="Наблюдений для риска" value={String(data.riskCount)} />
          <Metric label="Покрытие интервала P10–P90" value={probabilityText(data.coverage)} />
        </dl>
        {data.calibrationBins.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">Калибровочных наблюдений недостаточно.</p>
        ) : (
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            {data.calibrationBins.map((bin, i) => (
              <Metric
                key={i}
                label={`Диапазон ${probabilityText(bin.from)} — ${probabilityText(bin.to)}`}
                value={`Наблюдений: ${bin.count}`}
                note={`Средняя оценка: ${probabilityText(bin.mean)} · Фактическая частота: ${probabilityText(bin.observed)}`}
              />
            ))}
          </dl>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold">Загруженные исторические срезы</h3>
        {data.origins.length === 0 ? (
          <p className="text-muted-foreground mt-3">Срезы не загружены.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.origins.map((origin, i) => (
              <li key={i} className="border-border rounded-lg border p-4">
                <h4 className="font-semibold">
                  {formatDate(origin.date)} —{" "}
                  {origin.status === "UNKNOWN"
                    ? "Неизвестное состояние среза"
                    : origin.evaluated
                      ? "Проверен"
                      : "Пропущен"}
                </h4>
                {origin.reason && <p className="text-muted-foreground mt-2">{origin.reason}</p>}
                <p className="text-muted-foreground mt-2 text-sm">
                  Дней: {origin.days} · MAE: {moneyText(origin.mae)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
      {data.warnings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Ограничения проверки</h3>
          <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5">
            {data.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

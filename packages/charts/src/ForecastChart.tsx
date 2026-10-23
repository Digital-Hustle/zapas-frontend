import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { spring } from "@zapas/tokens/motion";
import { Button, formatDate, formatMoneyCompact } from "@zapas/ui";
import { formatChartAmount, plotAmount, prepareChartPoints } from "./plot.ts";
import type { ActualPoint, ForecastPoint } from "./types.ts";

export interface ForecastChartProps {
  points: readonly ForecastPoint[];
  actuals?: readonly ActualPoint[];
  asOfDate: string;
  threshold: string | null;
  label: string;
}

const series = [
  ["actualAmount", "Фактический остаток"],
  ["balance", "Основной прогноз"],
  ["p10", "P10"],
  ["p50", "P50 — медиана сценариев"],
  ["p90", "P90"],
] as const;

export function ForecastChart({ points, actuals = [], asOfDate, threshold, label }: ForecastChartProps) {
  const captionId = useId();
  const tableId = useId();
  const [showTable, setShowTable] = useState(false);
  const reducedMotion = useReducedMotion();
  const data = prepareChartPoints(points, actuals, asOfDate);
  const buffer = plotAmount(threshold);

  if (
    !data.some(
      (p) => p.actual !== null || p.pointBalance !== null || p.median !== null || p.interval !== null,
    )
  ) {
    return <p className="text-muted-foreground text-base">Нет данных для графика.</p>;
  }

  return (
    <figure className="min-w-0" aria-labelledby={captionId}>
      <figcaption id={captionId} className="text-lg font-semibold">
        {label}
      </figcaption>
      <p className="text-muted-foreground mt-2 text-sm">
        Факт по {formatDate(asOfDate)} включительно. Прогноз после этой даты — отдельный ряд.
      </p>
      <motion.div
        className="mt-4 h-72 w-full text-xs"
        aria-hidden="true"
        initial={reducedMotion ? false : { clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={spring.chart}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={data} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => formatDate(v, "short")}
              tick={{ fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              width="auto"
              tickFormatter={(v: number) => formatMoneyCompact(String(v))}
              tick={{ fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Area
              dataKey="interval"
              type="linear"
              fill="var(--chart-band)"
              stroke="none"
              isAnimationActive={false}
              connectNulls={false}
            />
            <ReferenceLine x={asOfDate} stroke="var(--muted-foreground)" strokeDasharray="2 4" />
            <ReferenceLine y={0} stroke="var(--chart-threshold)" ifOverflow="extendDomain" />
            {buffer !== null && (
              <ReferenceLine
                y={buffer}
                stroke="var(--warning-soft-foreground)"
                strokeDasharray="6 4"
                ifOverflow="extendDomain"
              />
            )}
            <Line
              dataKey="actual"
              type="linear"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={{ r: 2 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              dataKey="pointBalance"
              type="linear"
              stroke="var(--chart-balance)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              dataKey="median"
              type="linear"
              stroke="var(--chart-scenario)"
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                const row = payload[0]?.payload as (typeof data)[number] | undefined;
                return active && row ? (
                  <div className="border-border bg-card shadow-card rounded-md border p-3 text-sm">
                    <p className="font-medium">{formatDate(row.date)}</p>
                    {series.map(([key, name]) => (
                      <p key={key}>
                        {name}: {formatChartAmount(row[key])}
                      </p>
                    ))}
                  </div>
                ) : null;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>
      <ul
        className="text-muted-foreground mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
        aria-label="Обозначения графика"
      >
        {actuals.length > 0 && (
          <li>
            <span className="bg-foreground mr-2 inline-block h-0.5 w-4" />
            Факт
          </li>
        )}
        <li>
          <span className="bg-chart-balance mr-2 inline-block h-0.5 w-4" />
          Основной прогноз
        </li>
        <li>
          <span className="border-chart-scenario mr-2 inline-block w-4 border-t-2 border-dashed" />
          P50 — медиана сценариев
        </li>
        <li>
          <span className="bg-chart-band mr-2 inline-block h-3 w-4 rounded-xs" />
          P10–P90 — интервал сценариев
        </li>
        <li>
          <span className="bg-chart-threshold mr-2 inline-block h-0.5 w-4" />
          Нулевой остаток
        </li>
        {buffer !== null && (
          <li>
            <span className="border-warning-soft-foreground mr-2 inline-block w-4 border-t-2 border-dashed" />
            Минимальный остаток: {formatChartAmount(threshold)}
          </li>
        )}
      </ul>
      <div className="mt-4 overflow-x-auto" role="region" aria-label="Данные графика по дням">
        <Button
          size="sm"
          variant="ghost"
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((value) => !value)}
        >
          {showTable ? "Скрыть данные по дням" : "Данные по дням"}
        </Button>
        <div id={tableId} className={showTable ? "mt-4" : "sr-only"}>
          <table className="w-full text-left text-sm tabular-nums">
            <caption className="mb-3 text-left font-medium">Значения по датам, рубли</caption>
            <thead>
              <tr>
                <th scope="col" className="p-2">
                  Дата
                </th>
                {series.map(([key, name]) => (
                  <th scope="col" className="p-2" key={key}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.date} className="border-border border-t">
                  <th scope="row" className="p-2 whitespace-nowrap">
                    {formatDate(point.date)}
                  </th>
                  {series.map(([key]) => (
                    <td key={key} className="p-2 whitespace-nowrap">
                      {formatChartAmount(point[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </figure>
  );
}

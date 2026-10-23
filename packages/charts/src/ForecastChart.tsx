import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { spring } from "@zapas/tokens/motion";
import { formatDate, formatMoney, formatMoneyCompact } from "@zapas/ui";
import { plotAmount, prepareForecastPoints } from "./plot.ts";
import type { ForecastPoint } from "./types.ts";

export interface ForecastChartProps {
  points: readonly ForecastPoint[];
  threshold: string;
  label: string;
}

export function ForecastChart({ points, threshold, label }: ForecastChartProps) {
  const captionId = useId();
  const reducedMotion = useReducedMotion();
  const data = prepareForecastPoints(points);
  const buffer = plotAmount(threshold);

  if (!data.some((point) => point.balance !== null || point.interval !== null)) {
    return <p className="text-muted-foreground text-base">Нет данных для графика.</p>;
  }

  return (
    <figure className="min-w-0" aria-labelledby={captionId}>
      <figcaption id={captionId} className="text-lg font-semibold">
        {label}
      </figcaption>
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
              tickFormatter={(value: string) => formatDate(value, "short")}
              tick={{ fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              width="auto"
              tickFormatter={(value: number) => formatMoneyCompact(String(value))}
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
              dataKey="balance"
              type="linear"
              stroke="var(--chart-balance)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </motion.div>
      <ul
        className="text-muted-foreground mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"
        aria-label="Обозначения графика"
      >
        <li>
          <span className="bg-chart-balance mr-2 inline-block h-0.5 w-4" />
          P50 — основной сценарий
        </li>
        <li>
          <span className="bg-chart-band mr-2 inline-block h-3 w-4 rounded-xs" />
          P10–P90 — интервал
        </li>
        <li>
          <span className="bg-chart-threshold mr-2 inline-block h-0.5 w-4" />
          Нулевой остаток
        </li>
        {buffer !== null && (
          <li>
            <span className="border-warning-soft-foreground mr-2 inline-block w-4 border-t-2 border-dashed" />
            Минимальный остаток: {formatMoney(threshold)}
          </li>
        )}
      </ul>
      <table className="sr-only">
        <caption>Значения прогноза по датам</caption>
        <thead>
          <tr>
            <th scope="col">Дата</th>
            <th scope="col">P10</th>
            <th scope="col">P50</th>
            <th scope="col">P90</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDate(point.date)}</th>
              {[point.p10, point.p50, point.p90].map((amount, index) => (
                <td key={index}>
                  {plotAmount(amount) === null ? "Нет данных" : formatMoney(amount ?? "", { kopecks: true })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

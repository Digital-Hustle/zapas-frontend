import type { ActualPoint, ForecastPoint } from "./types.ts";

const moneyPattern = /^-?\d{1,17}\.\d{2}$/;

export function plotAmount(value: string | null): number | null {
  if (value === null || !moneyPattern.test(value)) return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export function prepareForecastPoints(points: readonly ForecastPoint[]) {
  return points.map((point) => {
    const low = plotAmount(point.p10);
    const high = plotAmount(point.p90);
    return {
      ...point,
      pointBalance: plotAmount(point.balance),
      median: plotAmount(point.p50),
      interval: low === null || high === null ? null : [low, high],
    };
  });
}

export function prepareChartPoints(
  points: readonly ForecastPoint[],
  actuals: readonly ActualPoint[],
  asOfDate: string,
) {
  const forecasts = new Map(
    prepareForecastPoints(points)
      .filter((p) => p.date > asOfDate)
      .map((p) => [p.date, p]),
  );
  const history = new Map(actuals.filter((p) => p.date <= asOfDate).map((p) => [p.date, p]));
  const dates = [...new Set([...forecasts.keys(), ...history.keys(), asOfDate])].sort();
  return dates.map((date) => {
    const forecast = forecasts.get(date);
    const actual = history.get(date)?.balance ?? null;
    return {
      date,
      actual: plotAmount(actual),
      actualAmount: actual,
      pointBalance: forecast?.pointBalance ?? null,
      median: forecast?.median ?? null,
      interval: forecast?.interval ?? null,
      balance: forecast?.balance ?? null,
      p10: forecast?.p10 ?? null,
      p50: forecast?.p50 ?? null,
      p90: forecast?.p90 ?? null,
    };
  });
}

const integerFormat = new Intl.NumberFormat("ru-RU");

export function formatChartAmount(value: string | null): string {
  if (value === null || !moneyPattern.test(value)) return "Нет данных";
  const [integer = "0", fraction] = value.replace(/^-/, "").split(".");
  return `${value.startsWith("-") ? "−" : ""}${integerFormat.format(BigInt(integer))},${fraction} ₽`;
}

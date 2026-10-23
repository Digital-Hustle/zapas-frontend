import type { ForecastPoint } from "./types.ts";

export function plotAmount(value: string | null): number | null {
  if (value === null || !/^-?\d{1,17}\.\d{2}$/.test(value)) return null;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export function prepareForecastPoints(points: readonly ForecastPoint[]) {
  return points.map((point) => {
    const low = plotAmount(point.p10);
    const high = plotAmount(point.p90);
    return {
      ...point,
      balance: plotAmount(point.p50),
      interval: low === null || high === null ? null : [low, high],
    };
  });
}

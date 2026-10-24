import { describe, expect, it } from "vitest";
import { prepareForecastPoints } from "../src/plot.ts";
import { prepareChartPoints, formatChartAmount } from "../src/plot.ts";

describe("forecast plotting", () => {
  it("keeps zero and negative balances and the original exact strings", () => {
    const points = [{ date: "2026-10-23", balance: "25.01", p10: "-250.50", p50: "0.00", p90: "1250.25" }];
    expect(prepareForecastPoints(points)).toEqual([
      { ...points[0], pointBalance: 25.01, median: 0, interval: [-250.5, 1250.25] },
    ]);
    expect(points[0]?.p10).toBe("-250.50");
  });

  it("leaves missing balances and incomplete intervals as gaps", () => {
    expect(
      prepareForecastPoints([
        { date: "2026-10-23", balance: null, p10: null, p50: null, p90: "500.00" },
        { date: "2026-10-24", balance: "0.00", p10: "-500.00", p50: "-100.00", p90: null },
      ]),
    ).toMatchObject([
      { pointBalance: null, median: null, interval: null },
      { pointBalance: 0, median: -100, interval: null },
    ]);
  });

  it("does not draw malformed amounts as zero or infinity", () => {
    expect(
      prepareForecastPoints([
        { date: "2026-10-23", balance: "invalid", p10: "", p50: "invalid", p90: "Infinity" },
      ]),
    ).toMatchObject([{ pointBalance: null, median: null, interval: null }]);
  });

  it("accepts an empty forecast", () => {
    expect(prepareForecastPoints([])).toEqual([]);
  });
});

it("separates actuals from future values at the cutoff and preserves missing dates", () => {
  const points = [{ date: "2026-10-25", balance: "12.30", p10: null, p50: "11.00", p90: null }];
  const actuals = [
    { date: "2026-10-23", balance: "8.00" },
    { date: "2026-10-24", balance: null },
    { date: "2026-10-25", balance: "99.00" },
  ];
  expect(prepareChartPoints(points, actuals, "2026-10-24")).toMatchObject([
    { date: "2026-10-23", actual: 8, pointBalance: null, median: null },
    { date: "2026-10-24", actual: null, pointBalance: null, median: null },
    { date: "2026-10-25", actual: null, pointBalance: 12.3, median: 11 },
  ]);
});

it("keeps money exact when it cannot be represented by a JS number", () => {
  expect(formatChartAmount("99999999999999999.99").replace(/\s/g, " ")).toBe("99 999 999 999 999 999,99 ₽");
  expect(formatChartAmount("-0.01")).toBe("−0,01 ₽");
  expect(formatChartAmount(null)).toBe("Нет данных");
  expect(formatChartAmount("invalid")).toBe("Нет данных");
});

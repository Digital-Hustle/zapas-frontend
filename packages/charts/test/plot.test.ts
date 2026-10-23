import { describe, expect, it } from "vitest";
import { prepareForecastPoints } from "../src/plot.ts";

describe("forecast plotting", () => {
  it("keeps zero and negative balances and the original exact strings", () => {
    const points = [{ date: "2026-10-23", p10: "-250.50", p50: "0.00", p90: "1250.25" }];
    expect(prepareForecastPoints(points)).toEqual([
      { ...points[0], balance: 0, interval: [-250.5, 1250.25] },
    ]);
    expect(points[0]?.p10).toBe("-250.50");
  });

  it("leaves missing balances and incomplete intervals as gaps", () => {
    expect(
      prepareForecastPoints([
        { date: "2026-10-23", p10: null, p50: null, p90: "500.00" },
        { date: "2026-10-24", p10: "-500.00", p50: "-100.00", p90: null },
      ]),
    ).toMatchObject([
      { balance: null, interval: null },
      { balance: -100, interval: null },
    ]);
  });

  it("does not draw malformed amounts as zero or infinity", () => {
    expect(
      prepareForecastPoints([{ date: "2026-10-23", p10: "", p50: "invalid", p90: "Infinity" }]),
    ).toMatchObject([{ balance: null, interval: null }]);
  });

  it("accepts an empty forecast", () => {
    expect(prepareForecastPoints([])).toEqual([]);
  });
});

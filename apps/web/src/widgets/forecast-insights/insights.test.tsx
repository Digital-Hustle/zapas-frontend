import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RiskDetails } from "./ui/RiskDetails.tsx";
import { QualityDetails } from "./ui/QualityDetails.tsx";
import { riskExample, qualityExample } from "./model/examples.ts";

function text(node: React.ReactNode) {
  return renderToStaticMarkup(node)
    .replace(/<[^>]+>/g, "")
    .replace(/\s/g, " ");
}

describe("v1 risk and quality presentation", () => {
  it("never replaces unavailable probability with a confident zero", () => {
    const html = text(
      <RiskDetails data={{ ...riskExample, availability: "INSUFFICIENT_HISTORY", probability: 0 }} />,
    );
    expect(html).toContain("Недостаточно истории для вероятности");
    expect(html).not.toContain("0 %");
  });

  it("shows a genuine zero only for available probability", () => {
    const html = text(<RiskDetails data={{ ...riskExample, availability: "AVAILABLE", probability: 0 }} />);
    expect(html).toContain("0 %");
    expect(html).toContain("Сценарная оценка по истории");
    expect(html).toContain("не показатель точности");
  });

  it("keeps the server shortfall exact and recommendations subject to agreement", () => {
    const html = text(<RiskDetails data={{ ...riskExample, shortfall: "99999999999999999.99" }} />);
    expect(html).toContain("99 999 999 999 999 999,99 ₽");
    expect(html).toContain("Требует вашего согласования");
    expect(html).toContain("Недостаточно сценариев для оценки суммы");
  });

  it("handles unknown availability and missing factors without crashing", () => {
    const html = text(
      <RiskDetails data={{ ...riskExample, availability: "FUTURE_VALUE", factors: [], actions: [] }} />,
    );
    expect(html).toContain("Оценка вероятности недоступна");
    expect(html).toContain("Факторы не переданы");
    expect(html).toContain("Рекомендации не переданы");
  });

  it("does not turn a failed or empty backtest into perfect accuracy", () => {
    const html = text(
      <QualityDetails data={{ ...qualityExample, status: "FAILED", mae: null, rmse: null, recall: null }} />,
    );
    expect(html).toContain("Проверка не завершена");
    expect(html).toContain("Недостаточно наблюдений");
    expect(html).not.toContain("100 %");
    expect(html).toContain("Пропущено срезов");
  });

  it("shows an uncalculated quality state without fabricated metrics", () => {
    const html = text(<QualityDetails data={null} />);
    expect(html).toContain("Качество ещё не проверено");
    expect(html).not.toContain("MAE остатка");
  });

  it("treats null and invalid probability as unavailable even with an available enum", () => {
    for (const probability of [null, Number.NaN, -0.1, 1.1]) {
      const html = text(<RiskDetails data={{ ...riskExample, availability: "AVAILABLE", probability }} />);
      expect(html).toContain("Недостаточно наблюдений");
      expect(html).not.toContain("NaN");
    }
  });

  it("shows metric units, sample counts, skipped reasons and staleness independently", () => {
    const html = text(<QualityDetails data={qualityExample} />);
    expect(html).toContain("MAE остатка");
    expect(html).toContain("12 500,25 ₽");
    expect(html).toContain("Brier score");
    expect(html).toContain("5 дней");
    expect(html).toContain("Результат устарел");
    expect(html).toContain("История до отсечки неполна");
    expect(html).not.toContain("Точность:");
  });
});

it("keeps an unknown origin distinct from an explicit skipped origin", () => {
  const html = text(
    <QualityDetails
      data={{
        ...qualityExample,
        origins: [
          { date: "2026-01-01", evaluated: false, reason: null, days: 0, mae: null, status: "UNKNOWN" },
        ],
      }}
    />,
  );
  expect(html).toContain("Неизвестное состояние среза");
  expect(html).not.toContain("Пропущен</h4>");
});

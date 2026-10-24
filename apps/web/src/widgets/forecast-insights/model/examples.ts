import type { QualityDetailsModel, RiskDetailsModel } from "./types.ts";

export const riskExample: RiskDetailsModel = {
  kind: "CASH_GAP",
  from: "2026-11-09",
  to: "2026-11-13",
  minimumBalance: "-45000.50",
  shortfall: "45000.50",
  threshold: "0.00",
  shortfallP50: null,
  shortfallP90: null,
  availability: "INSUFFICIENT_HISTORY",
  probability: null,
  scenarioCount: 0,
  originCount: 3,
  assumptions: ["Ожидаемые платежи могут измениться. Полнота истории подтверждена не для всех дней."],
  factors: [
    {
      title: "Ближайшая оплата поставщику",
      description: "Плановый расход совпадает с периодом низких поступлений.",
      amount: "80000.00",
      date: "2026-11-09",
    },
    {
      title: "Неполная история",
      description: "Для сценарной вероятности пока недостаточно завершённых исторических срезов.",
      amount: null,
      date: null,
    },
  ],
  actions: [
    {
      title: "Обсудить срок оплаты",
      description:
        "Уточните ожидаемую дату поступления и возможность согласованного изменения плана. Налоговые сроки нельзя менять без законного основания.",
      requiresAgreement: true,
    },
  ],
};

export const qualityExample: QualityDetailsModel = {
  status: "PARTIAL",
  stale: true,
  firstOrigin: "2026-06-01",
  lastOrigin: "2026-09-01",
  windowWeeks: 8,
  algorithmVersion: "weekday-mean-v1-example",
  evaluatedOrigins: 9,
  skippedOrigins: 2,
  evaluatedDays: 270,
  mae: "12500.25",
  rmse: "18300.00",
  horizons: [
    { day: 1, mae: "3000.00", rmse: "4000.00", count: 9 },
    { day: 7, mae: "7000.00", rmse: "9000.00", count: 9 },
    { day: 14, mae: "14000.00", rmse: "16000.00", count: 9 },
    { day: 30, mae: null, rmse: null, count: 0 },
  ],
  precision: null,
  recall: null,
  truePositive: 0,
  falsePositive: 0,
  falseNegative: 0,
  leadDays: 5,
  dateMaeDays: null,
  shortfallMae: null,
  brier: null,
  riskCount: 0,
  coverage: null,
  calibrationBins: [],
  origins: [
    { date: "2026-06-01", evaluated: false, reason: "История до отсечки неполна", days: 0, mae: null },
  ],
  warnings: ["Проверка частичная. Метрики не гарантируют качество будущего прогноза."],
};

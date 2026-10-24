export interface RiskDetailsModel {
  kind: string;
  from: string;
  to: string;
  minimumBalance: string | null;
  shortfall: string | null;
  threshold: string | null;
  shortfallP50: string | null;
  shortfallP90: string | null;
  availability: string;
  probability: number | null;
  scenarioCount: number;
  originCount: number;
  assumptions: readonly string[];
  factors: readonly { title: string; description: string; amount: string | null; date: string | null }[];
  actions: readonly { title: string; description: string; requiresAgreement: boolean }[];
}

export interface QualityDetailsModel {
  status: string;
  stale: boolean;
  firstOrigin: string;
  lastOrigin: string;
  windowWeeks: number;
  algorithmVersion: string;
  evaluatedOrigins: number;
  skippedOrigins: number;
  evaluatedDays: number;
  mae: string | null;
  rmse: string | null;
  horizons: readonly { day: number; mae: string | null; rmse: string | null; count: number }[];
  precision: number | null;
  recall: number | null;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  leadDays: number | null;
  dateMaeDays: number | null;
  shortfallMae: string | null;
  brier: number | null;
  riskCount: number;
  coverage: number | null;
  calibrationBins: readonly {
    from: number;
    to: number;
    count: number;
    mean: number | null;
    observed: number | null;
  }[];
  origins: readonly {
    date: string;
    evaluated: boolean;
    status?: "EVALUATED" | "SKIPPED" | "UNKNOWN";
    reason: string | null;
    days: number;
    mae: string | null;
  }[];
  warnings: readonly string[];
}

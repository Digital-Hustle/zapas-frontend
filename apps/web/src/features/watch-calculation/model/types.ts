export interface Calculation {
  id: string;
  status: string;
  createdAt: string;
  progress: number | null;
  resultId: string | null;
  error: { detail: string; traceId: string | null } | null;
}

export interface CalculationScope {
  companyId: string;
  accountId: string;
  jobId: string;
}

export type ReadCalculation = (scope: CalculationScope, signal: AbortSignal) => Promise<Calculation>;

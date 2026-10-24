export interface ForecastPoint {
  date: string;
  balance: string | null;
  p10: string | null;
  p50: string | null;
  p90: string | null;
}

export interface ActualPoint {
  date: string;
  balance: string | null;
}

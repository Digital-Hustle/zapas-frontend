import { useQuery } from "@tanstack/react-query";
import { pollingDelay } from "./polling.ts";
import type { Calculation, CalculationScope } from "./types.ts";

export const calculationKey = ({ companyId, accountId, jobId }: CalculationScope) =>
  ["calculation", companyId, accountId, jobId] as const;

export function useCalculation<T extends Calculation>(
  scope: CalculationScope,
  read: (scope: CalculationScope, signal: AbortSignal) => Promise<T>,
  enabled = true,
) {
  return useQuery({
    queryKey: calculationKey(scope),
    queryFn: ({ signal }) => read(scope, signal),
    enabled: enabled && Boolean(scope.companyId && scope.accountId && scope.jobId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: ({ state }) => {
      if (state.error || !state.data) return false;
      const createdAt = Date.parse(state.data.createdAt);
      const elapsed = Number.isFinite(createdAt) ? Math.max(0, Date.now() - createdAt) : 0;
      return pollingDelay(state.data.status, elapsed);
    },
  });
}

import { useQuery } from "@tanstack/react-query";
import { financialKeys } from "@/shared/api/financialKeys.ts";

export const cashflowKeys = {
  scope: financialKeys.scope,
  resource: (companyId: string, accountId: string, resource: string) =>
    [...financialKeys.scope(companyId, accountId), resource] as const,
};
export function useCashflow<T>(
  companyId: string,
  accountId: string,
  resource: string,
  read: (signal: AbortSignal) => Promise<T>,
  enabled: boolean,
  filters: readonly unknown[] = [],
) {
  return useQuery({
    queryKey: [...cashflowKeys.resource(companyId, accountId, resource), ...filters],
    queryFn: ({ signal }) => read(signal),
    enabled,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

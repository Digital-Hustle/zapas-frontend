import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cashflowKeys } from "@/entities/cashflow";
import { workspaceKeys } from "@/entities/workspace";
import type { BusinessScope } from "@/widgets/business-workspace";
import { accessDenied } from "@/shared/api/problem.ts";

export function useRefresh(scope: BusinessScope) {
  const client = useQueryClient();
  const companyId = scope.company.id,
    accountId = scope.account.id;
  return useCallback(() => {
    void client.invalidateQueries({ queryKey: cashflowKeys.scope(companyId, accountId) });
    void client.invalidateQueries({ queryKey: workspaceKeys.company(companyId) });
    void client.invalidateQueries({ queryKey: workspaceKeys.account(companyId, accountId) });
  }, [client, companyId, accountId]);
}
export function visible(query: { data: unknown; isError: boolean; error: unknown }) {
  return Boolean(query.data) && !(query.isError && accessDenied(query.error));
}

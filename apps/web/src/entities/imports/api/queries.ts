import { useQuery } from "@tanstack/react-query";
import { importsApi } from "./adapter.ts";

export const importKeys = {
  scope: (companyId: string, accountId: string) => ["imports", companyId, accountId] as const,
  report: (companyId: string, accountId: string, importId: string) =>
    ["imports", companyId, accountId, "report", importId] as const,
};
export function useImports(companyId: string, accountId: string, page: number, active: boolean) {
  return useQuery({
    queryKey: [...importKeys.scope(companyId, accountId), "list", page],
    queryFn: ({ signal }) => importsApi.list(companyId, accountId, page, signal),
    enabled: active,
    retry: false,
  });
}
export function useImportReport(
  companyId: string,
  accountId: string,
  importId: string | null,
  active: boolean,
) {
  return useQuery({
    queryKey: importKeys.report(companyId, accountId, importId ?? ""),
    queryFn: ({ signal }) => importsApi.report(companyId, accountId, importId ?? "", signal),
    enabled: active && importId !== null,
    refetchOnMount: "always",
    retry: false,
  });
}
export function useImportIssues(
  companyId: string,
  accountId: string,
  importId: string,
  page: number,
  active: boolean,
) {
  return useQuery({
    queryKey: [...importKeys.report(companyId, accountId, importId), "issues", page],
    queryFn: ({ signal }) => importsApi.issues(companyId, importId, page, signal),
    enabled: active,
    retry: false,
  });
}

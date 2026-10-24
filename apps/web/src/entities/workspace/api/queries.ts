import { useQuery } from "@tanstack/react-query";
import { workspaceApi } from "./adapter.ts";

export const workspaceKeys = {
  companies: ["workspace", "companies"] as const,
  company: (id: string) => ["workspace", "company", id] as const,
  accounts: (companyId: string) => ["workspace", "company", companyId, "accounts"] as const,
  account: (companyId: string, accountId: string) =>
    ["workspace", "company", companyId, "account", accountId] as const,
};
export function useCompanies(page: number, privateQueries: boolean) {
  return useQuery({
    queryKey: [...workspaceKeys.companies, page],
    queryFn: ({ signal }) => workspaceApi.companies(page, signal),
    enabled: privateQueries,
    retry: false,
  });
}
export function useCompany(companyId: string | null, privateQueries: boolean) {
  return useQuery({
    queryKey: workspaceKeys.company(companyId ?? ""),
    refetchOnMount: "always",
    queryFn: ({ signal }) => workspaceApi.company(companyId ?? "", signal),
    enabled: privateQueries && companyId !== null,
    retry: false,
  });
}
export function useAccounts(companyId: string, page: number, privateQueries: boolean) {
  return useQuery({
    queryKey: [...workspaceKeys.accounts(companyId), page],
    queryFn: ({ signal }) => workspaceApi.accounts(companyId, page, signal),
    enabled: privateQueries,
    retry: false,
  });
}
export function useAccount(companyId: string, accountId: string | null, privateQueries: boolean) {
  return useQuery({
    queryKey: workspaceKeys.account(companyId, accountId ?? ""),
    queryFn: ({ signal }) => workspaceApi.account(companyId, accountId ?? "", signal),
    enabled: privateQueries && accountId !== null,
    retry: false,
  });
}

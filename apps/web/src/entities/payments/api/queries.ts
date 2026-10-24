import { useQuery } from "@tanstack/react-query";
import { financialKeys } from "@/shared/api/financialKeys.ts";
import { paymentsApi } from "./adapter.ts";
import type { PaymentFilters } from "../model/payment.ts";

export const paymentKeys = {
  scope: (companyId: string, accountId: string) =>
    [...financialKeys.scope(companyId, accountId), "payments"] as const,
  payment: (companyId: string, accountId: string, paymentId: string) =>
    [...financialKeys.scope(companyId, accountId), "payment", paymentId] as const,
};
export function usePayments(
  companyId: string,
  accountId: string,
  filters: PaymentFilters,
  page: number,
  active: boolean,
) {
  return useQuery({
    queryKey: [...paymentKeys.scope(companyId, accountId), filters, page],
    queryFn: ({ signal }) => paymentsApi.list(companyId, accountId, filters, page, signal),
    enabled: active,
    retry: false,
  });
}
export function usePayment(companyId: string, accountId: string, paymentId: string | null, active: boolean) {
  return useQuery({
    queryKey: paymentKeys.payment(companyId, accountId, paymentId ?? ""),
    queryFn: ({ signal }) => paymentsApi.payment(companyId, accountId, paymentId ?? "", signal),
    enabled: active && paymentId !== null,
    retry: false,
    refetchOnMount: "always",
  });
}
export function useCategories(companyId: string, active: boolean) {
  return useQuery({
    queryKey: ["categories", companyId],
    queryFn: ({ signal }) => paymentsApi.categories(companyId, signal),
    enabled: active,
    retry: false,
  });
}
export function useCounterparties(
  companyId: string,
  accountId: string,
  search: string,
  page: number,
  active: boolean,
) {
  return useQuery({
    queryKey: [...financialKeys.scope(companyId, accountId), "counterparties", search, page],
    queryFn: ({ signal }) => paymentsApi.counterparties(companyId, accountId, search, page, signal),
    enabled: active,
    retry: false,
  });
}

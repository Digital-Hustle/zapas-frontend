import type { PaymentFilterDraft } from "@/entities/payments";
export const initialPaymentFilters: PaymentFilterDraft = {
  fromDate: "",
  toDate: "",
  direction: "ALL",
  categoryCode: "",
  counterpartyKey: "",
  q: "",
  sort: "operationDate,desc",
};

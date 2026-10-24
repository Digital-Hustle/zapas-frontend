import {
  bulkChangeCategory,
  changePaymentCategory,
  getPayment,
  listCategories,
  listCounterparties,
  listPayments,
} from "@zapas/api/orchestrator";
import { z } from "zod";
import { businessCall } from "@/shared/api/problem.ts";
import {
  bulkCategorySchema,
  categoryDraftSchema,
  mapCategory,
  mapCounterparty,
  mapPayment,
  paymentPageSchema,
  type BulkCategoryDraft,
  type CategoryDraft,
  type PaymentFilters,
} from "../model/payment.ts";

const quiet: RequestInit & { silent: true } = { silent: true };
const uuid = z.uuid();
const match = (value: number) => `"${z.number().int().positive().max(Number.MAX_SAFE_INTEGER).parse(value)}"`;
export const paymentsApi = {
  list: (companyId: string, accountId: string, filters: PaymentFilters, page: number, signal: AbortSignal) =>
    businessCall(async () => {
      const result = await listPayments(
        uuid.parse(companyId),
        { ...filters, accountId: uuid.parse(accountId), page, size: 25 },
        { ...quiet, signal },
      );
      return {
        items: result.items.map((value) => mapPayment(value, companyId, accountId)),
        page: paymentPageSchema.parse(result.page),
      };
    }),
  payment: (companyId: string, accountId: string, paymentId: string, signal: AbortSignal) =>
    businessCall(async () => {
      const result = mapPayment(
        await getPayment(uuid.parse(companyId), uuid.parse(paymentId), { ...quiet, signal }),
        companyId,
        accountId,
      );
      z.literal(paymentId).parse(result.id);
      return result;
    }),
  categories: (companyId: string, signal: AbortSignal) =>
    businessCall(async () => {
      const result = await listCategories(uuid.parse(companyId), { ...quiet, signal });
      return result.items.map(mapCategory);
    }),
  counterparties: (companyId: string, accountId: string, search: string, page: number, signal: AbortSignal) =>
    businessCall(async () => {
      const result = await listCounterparties(
        uuid.parse(companyId),
        { accountId: uuid.parse(accountId), ...(search.trim() ? { q: search.trim() } : {}), page, size: 50 },
        { ...quiet, signal },
      );
      return { items: result.items.map(mapCounterparty), page: paymentPageSchema.parse(result.page) };
    }),
  category: (
    companyId: string,
    accountId: string,
    paymentId: string,
    draft: CategoryDraft,
    version: number,
  ) =>
    businessCall(async () => {
      const result = mapPayment(
        await changePaymentCategory(
          uuid.parse(companyId),
          uuid.parse(paymentId),
          categoryDraftSchema.parse(draft),
          { "If-Match": match(version) },
          quiet,
        ),
        companyId,
        accountId,
      );
      z.literal(paymentId).parse(result.id);
      return result;
    }),
  bulk: (companyId: string, accountId: string, draft: BulkCategoryDraft, key: string) =>
    businessCall(async () => {
      const value = bulkCategorySchema.parse(draft);
      const result = await bulkChangeCategory(
        uuid.parse(companyId),
        value,
        { "Idempotency-Key": uuid.parse(key) },
        quiet,
      );
      const items = result.items.map((item) => mapPayment(item, companyId, accountId));
      const requested = new Set(value.payments.map((row) => row.paymentId));
      z.literal(requested.size).parse(new Set(items.map((row) => row.id)).size);
      z.literal(requested.size).parse(items.length);
      z.literal(true).parse(items.every((row) => requested.has(row.id)));
      return items;
    }),
};

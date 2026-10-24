import { z } from "zod";

const bounded = (max: number) => z.string().refine((value) => Array.from(value).length <= max);
const money = z.string().regex(/^-?(0|[1-9][0-9]{0,16})\.[0-9]{2}$/u);
const positiveMoney = z
  .string()
  .regex(/^(0|[1-9][0-9]{0,16})\.[0-9]{2}$/u)
  .refine((value) => value !== "0.00");
const version = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const code = z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/u);
const direction = z.enum(["IN", "OUT", "UNKNOWN"]).catch("UNKNOWN");
const payment = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  accountId: z.uuid(),
  importId: z.uuid(),
  externalOperationId: z.string().nullable(),
  operationDate: z.iso.date(),
  amount: positiveMoney,
  direction,
  counterpartyInn: z.string().nullable(),
  counterpartyName: z.string().nullable(),
  purpose: z.string().nullable(),
  categoryCode: bounded(64),
  categorySource: z.enum(["RULE", "COUNTERPARTY", "USER", "OTHER", "UNKNOWN"]).catch("UNKNOWN"),
  ruleVersion: z.string().nullable(),
  balanceEod: money.nullable(),
  allocatedAmount: money,
  version,
  createdAt: z.iso.datetime(),
});
export function mapPayment(value: unknown, companyId: string, accountId: string) {
  const result = payment
    .refine((value) => value.companyId === companyId && value.accountId === accountId)
    .parse(value);
  return { ...result };
}
export type Payment = ReturnType<typeof mapPayment>;
const category = z.object({ code, name: bounded(100), directions: z.array(direction), system: z.boolean() });
export function mapCategory(value: unknown) {
  return category.parse(value);
}
export type Category = ReturnType<typeof mapCategory>;
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const paymentPageSchema = z.object({
  page: count,
  size: z.number().int().positive().max(200),
  total: count,
  hasNext: z.boolean(),
});
export const categoryDraftSchema = z.object({ categoryCode: code });
export type CategoryDraft = z.infer<typeof categoryDraftSchema>;
export const bulkCategorySchema = z.object({
  categoryCode: code,
  payments: z
    .array(z.object({ paymentId: z.uuid(), expectedVersion: version }))
    .min(1)
    .max(200)
    .refine(
      (values) => new Set(values.map((value) => value.paymentId)).size === values.length,
      "Операции не должны повторяться",
    ),
});
export type BulkCategoryDraft = z.infer<typeof bulkCategorySchema>;
export const paymentFilterSchema = z
  .object({
    fromDate: z.string(),
    toDate: z.string(),
    direction: z.enum(["ALL", "IN", "OUT"]),
    categoryCode: z.union([code, z.literal("")]),
    counterpartyKey: bounded(150),
    q: bounded(200),
    sort: z.enum(["operationDate,desc", "operationDate,asc"]),
  })
  .superRefine((value, context) => {
    if (value.fromDate === "" && value.toDate === "") return;
    const from = z.iso.date().safeParse(value.fromDate),
      to = z.iso.date().safeParse(value.toDate);
    if (!from.success || !to.success || from.data > to.data)
      context.addIssue({
        code: "custom",
        path: ["fromDate"],
        message: "Выберите полный период: начало не позже конца",
      });
  });
export type PaymentFilterDraft = z.infer<typeof paymentFilterSchema>;
export function preparePaymentFilters(value: unknown) {
  const draft = paymentFilterSchema.parse(value);
  return {
    ...(draft.fromDate ? { fromDate: draft.fromDate, toDate: draft.toDate } : {}),
    ...(draft.direction !== "ALL" ? { direction: draft.direction } : {}),
    ...(draft.categoryCode ? { categoryCode: draft.categoryCode } : {}),
    ...(draft.counterpartyKey ? { counterpartyKey: draft.counterpartyKey } : {}),
    ...(draft.q.trim() ? { q: draft.q.trim() } : {}),
    sort: draft.sort,
  };
}
export type PaymentFilters = ReturnType<typeof preparePaymentFilters>;
const counterparty = z.object({ key: bounded(150), inn: z.string().nullable(), name: z.string().nullable() });
export function mapCounterparty(value: unknown) {
  return counterparty.parse(value);
}

import { z } from "zod";

const money = z.string().regex(/^-?[0-9]{1,17}\.[0-9]{2}$/u, "Введите сумму с двумя знаками после запятой");
export const balanceAnchorSchema = z.object({
  date: z.iso.date({ error: "Выберите дату подтверждённого остатка" }),
  balance: money,
  reason: z
    .string()
    .refine(
      (value) => /\S/u.test(value) && Array.from(value).length <= 500,
      "Укажите основание: от 1 до 500 символов",
    ),
});
export type BalanceAnchorDraft = z.infer<typeof balanceAnchorSchema>;
const response = z.object({
  id: z.uuid(),
  accountId: z.uuid(),
  date: z.iso.date(),
  balance: money,
  source: z.enum(["STATEMENT", "MANUAL"]),
  reason: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export function mapBalanceAnchor(value: unknown, accountId: string) {
  return response.refine((anchor) => anchor.accountId === accountId).parse(value);
}
export type BalanceAnchor = ReturnType<typeof mapBalanceAnchor>;

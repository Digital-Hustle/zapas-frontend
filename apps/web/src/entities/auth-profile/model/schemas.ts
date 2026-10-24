import { z } from "zod";

export const emailSchema = z.string().trim().pipe(z.email("Проверьте адрес почты").max(254));
export const otpSchema = z.string().regex(/^[0-9]{6}$/u, "Введите шесть цифр из письма");
export const profileSchema = z.object({
  displayName: z
    .string()
    .nullable()
    .refine(
      (name) => name === null || (/\S/u.test(name) && Array.from(name).length <= 100),
      "Имя: от 1 до 100 символов, не только пробелы",
    ),
  version: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});

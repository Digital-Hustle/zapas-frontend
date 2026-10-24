import { z } from "zod";

export const maxStatementSize = 20 * 1024 * 1024;
export const importDraftSchema = z
  .object({
    file: z
      .instanceof(File, { error: "Выберите CSV-файл" })
      .nullable()
      .transform((value, context) => {
        if (value) return value;
        context.addIssue({ code: "custom", message: "Выберите CSV-файл" });
        return z.NEVER;
      })
      .refine(
        (file) => file.size > 0 && file.size <= maxStatementSize,
        "Файл должен быть непустым и не больше 20 МиБ",
      )
      .refine(
        (file) => /\.csv$/iu.test(file.name) && Array.from(file.name).length <= 200,
        "Выберите CSV с названием до 200 символов",
      ),
    validationMode: z.enum(["ATOMIC", "SKIP_INVALID"]),
    completeness: z.enum(["UNKNOWN", "CONFIRMED_COMPLETE"]),
    fromDate: z.string(),
    toDate: z.string(),
  })
  .superRefine((value, context) => {
    if (value.completeness !== "CONFIRMED_COMPLETE") return;
    const from = z.iso.date().safeParse(value.fromDate);
    const to = z.iso.date().safeParse(value.toDate);
    if (!from.success)
      context.addIssue({ code: "custom", path: ["fromDate"], message: "Выберите начало полного периода" });
    if (!to.success)
      context.addIssue({ code: "custom", path: ["toDate"], message: "Выберите конец полного периода" });
    if (from.success && to.success && from.data > to.data)
      context.addIssue({
        code: "custom",
        path: ["toDate"],
        message: "Конец периода не может быть раньше начала",
      });
  });
export type ImportDraft = z.infer<typeof importDraftSchema>;
export type ImportFormDraft = z.input<typeof importDraftSchema>;
export function prepareImport(accountId: string, draft: unknown) {
  const value = importDraftSchema.parse(draft);
  return {
    file: value.file,
    accountId: z.uuid().parse(accountId),
    validationMode: value.validationMode,
    completeness: value.completeness,
    ...(value.completeness === "CONFIRMED_COMPLETE"
      ? { declaredFromDate: value.fromDate, declaredToDate: value.toDate }
      : {}),
  };
}

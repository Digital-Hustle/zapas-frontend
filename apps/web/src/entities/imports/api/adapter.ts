import { ApiError } from "@zapas/api";
import { getImport, listImportIssues, listImports } from "@zapas/api/orchestrator";
import { uploadStatement } from "@zapas/api/preprocessor";
import { z } from "zod";
import { BusinessProblem, businessCall, mapBusinessFailure } from "@/shared/api/problem.ts";
import { mapImport, mapImportIssue, importPageSchema } from "../model/record.ts";
import { prepareImport, type ImportDraft } from "../model/upload.ts";

const quiet: RequestInit & { silent: true } = { silent: true };
const uuid = z.uuid();
export class ImportProblem extends BusinessProblem {
  constructor(
    issue: ConstructorParameters<typeof BusinessProblem>[0],
    readonly reportId: string | null,
  ) {
    super(issue);
  }
}
export const importsApi = {
  list: (companyId: string, accountId: string, page: number, signal: AbortSignal) =>
    businessCall(async () => {
      const result = await listImports(
        uuid.parse(companyId),
        { accountId: uuid.parse(accountId), page, size: 10 },
        { ...quiet, signal },
      );
      return {
        items: result.items.map((value) => mapImport(value, companyId, accountId)),
        page: importPageSchema.parse(result.page),
      };
    }),
  report: (companyId: string, accountId: string, importId: string, signal: AbortSignal) =>
    businessCall(async () => {
      const result = mapImport(
        await getImport(uuid.parse(companyId), uuid.parse(importId), { ...quiet, signal }),
        companyId,
        accountId,
      );
      z.literal(importId).parse(result.id);
      return result;
    }),
  issues: (companyId: string, importId: string, page: number, signal: AbortSignal) =>
    businessCall(async () => {
      const result = await listImportIssues(
        uuid.parse(companyId),
        uuid.parse(importId),
        { page, size: 20 },
        { ...quiet, signal },
      );
      return { items: result.items.map(mapImportIssue), page: importPageSchema.parse(result.page) };
    }),
  upload: async (companyId: string, accountId: string, draft: ImportDraft, key: string) => {
    try {
      const result = mapImport(
        await uploadStatement(
          uuid.parse(companyId),
          prepareImport(accountId, draft),
          { "Idempotency-Key": uuid.parse(key) },
          quiet,
        ),
        companyId,
        accountId,
      );
      if (result.status !== "COMMITTED")
        throw new ImportProblem(
          {
            kind: result.status === "REJECTED" || result.status === "ABORTED" ? "validation" : "unavailable",
            message: "Импорт не подтверждён. Проверьте статус и отчёт перед новой загрузкой.",
            ambiguous: result.status !== "REJECTED" && result.status !== "ABORTED",
          },
          result.id,
        );
      return result;
    } catch (error) {
      if (error instanceof ImportProblem) throw error;
      // The shared transport preserves Problem extensions; narrow the optional v1 field here.
      const extension =
        error instanceof ApiError && error.status === 422
          ? z.object({ resourceId: uuid.nullish() }).safeParse(error.problem)
          : null;
      const reportId = extension?.success ? (extension.data.resourceId ?? null) : null;
      const issue = mapBusinessFailure(error);
      if (error instanceof ApiError && error.status === 413)
        issue.message = "Файл превышает допустимый размер 20 МиБ.";
      if (error instanceof ApiError && error.status === 415)
        issue.message = "Формат файла не поддерживается. Загрузите CSV.";
      if (error instanceof ApiError && error.status === 422) {
        issue.kind = "validation";
        issue.message = "Импорт отклонён. Проверьте отчёт об ошибках и исходный файл.";
      }
      throw new ImportProblem(issue, reportId);
    }
  },
};

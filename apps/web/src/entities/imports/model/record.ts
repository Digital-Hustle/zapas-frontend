import { z } from "zod";

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const text = (max: number) => z.string().refine((value) => Array.from(value).length <= max);
const record = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  accountId: z.uuid(),
  status: z.enum(["RECEIVING", "STAGING", "COMMITTED", "REJECTED", "ABORTED", "UNKNOWN"]).catch("UNKNOWN"),
  fileName: text(200),
  fileSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  totalRows: count,
  acceptedRows: count,
  rejectedRows: count,
  duplicateRows: count,
  warningCount: count,
  fromDate: z.iso.date().nullable(),
  toDate: z.iso.date().nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  dataVersion: count.nullable(),
});
export function mapImport(value: unknown, companyId: string, accountId: string) {
  const result = record
    .refine((value) => value.companyId === companyId && value.accountId === accountId)
    .parse(value);
  return {
    id: result.id,
    companyId: result.companyId,
    accountId: result.accountId,
    status: result.status,
    fileName: result.fileName,
    total: result.totalRows,
    accepted: result.acceptedRows,
    rejected: result.rejectedRows,
    duplicates: result.duplicateRows,
    warnings: result.warningCount,
    fromDate: result.fromDate,
    toDate: result.toDate,
    createdAt: result.createdAt,
    completedAt: result.completedAt,
  };
}
export type StatementImport = ReturnType<typeof mapImport>;
const issue = z.object({
  id: z.uuid(),
  severity: z.enum(["INFO", "WARNING", "ERROR", "UNKNOWN"]).catch("UNKNOWN"),
  code: text(100),
  rowNumber: count.nullable(),
  field: z.string().nullable(),
  message: text(1000),
});
export function mapImportIssue(value: unknown) {
  return issue.parse(value);
}
export type StatementIssue = ReturnType<typeof mapImportIssue>;
export const importPageSchema = z.object({
  page: count,
  size: z.number().int().positive().max(200),
  total: count,
  hasNext: z.boolean(),
});

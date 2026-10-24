import { z } from "zod";

const name = (max: number) =>
  z
    .string()
    .refine(
      (value) => /\S/u.test(value) && Array.from(value).length <= max,
      `Введите от 1 до ${max} символов`,
    );
const optionalDigits = (pattern: RegExp, message: string) =>
  z.string().refine((value) => value === "" || pattern.test(value), message);
export const companyDraftSchema = z.object({
  name: name(200),
  legalForm: z.enum(["OOO", "IP", "OTHER"], { error: "Выберите форму организации" }),
  inn: optionalDigits(/^[0-9]{10}(?:[0-9]{2})?$/u, "ИНН: 10 или 12 цифр"),
  kpp: optionalDigits(/^[0-9]{9}$/u, "КПП: 9 цифр"),
});
export const accountDraftSchema = z.object({
  name: name(100),
  bankName: z.string().refine((value) => Array.from(value).length <= 200, "Название банка: до 200 символов"),
  accountNumber: optionalDigits(/^[0-9]{20}$/u, "Номер счёта: 20 цифр"),
  externalCompanyId: z
    .string()
    .refine((value) => Array.from(value).length <= 100, "ID компании в выписке: до 100 символов"),
});
export type CompanyDraft = z.infer<typeof companyDraftSchema>;
export type AccountDraft = z.infer<typeof accountDraftSchema>;
const permissions = z.object({
  canEditCompany: z.boolean(),
  canManageMembers: z.boolean(),
  canImport: z.boolean(),
  canEditPayments: z.boolean(),
  canManagePlans: z.boolean(),
  canRunForecast: z.boolean(),
  canRunBacktest: z.boolean(),
});
const version = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const companyResponse = z.object({
  id: z.uuid(),
  name: name(200),
  legalForm: z.enum(["OOO", "IP", "OTHER", "UNKNOWN"]).catch("UNKNOWN"),
  inn: z.string().nullable(),
  kpp: z.string().nullable(),
  timezone: z.literal("Europe/Moscow"),
  myRole: z.enum(["OWNER", "ACCOUNTANT", "VIEWER", "UNKNOWN"]).catch("UNKNOWN"),
  permissions,
  archived: z.boolean(),
  version,
});
const accountResponse = z.object({
  id: z.uuid(),
  companyId: z.uuid(),
  name: name(100),
  bankName: z.string().nullable(),
  accountNumber: z.string().nullable(),
  externalCompanyId: z.string().nullable(),
  currency: z.literal("RUB"),
  archived: z.boolean(),
  latestBalance: z
    .string()
    .regex(/^-?[0-9]{1,17}\.[0-9]{2}$/u)
    .nullable(),
  latestBalanceDate: z.iso.date().nullable(),
  version,
});
export const pageSchema = z.object({
  page: z.number().int().nonnegative(),
  size: z.number().int().positive().max(200),
  total: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  hasNext: z.boolean(),
});
export type PageMeta = z.infer<typeof pageSchema>;
export function mapCompany(value: unknown) {
  const result = companyResponse.parse(value);
  return {
    id: result.id,
    name: result.name,
    legalForm: result.legalForm,
    inn: result.inn,
    kpp: result.kpp,
    timezone: result.timezone,
    role: result.myRole,
    permissions: result.permissions,
    archived: result.archived,
    version: result.version,
  };
}
export type Company = ReturnType<typeof mapCompany>;
export function mapAccount(value: unknown, companyId: string) {
  const result = accountResponse.refine((account) => account.companyId === companyId).parse(value);
  return {
    id: result.id,
    companyId: result.companyId,
    name: result.name,
    bankName: result.bankName,
    accountNumber: result.accountNumber,
    externalCompanyId: result.externalCompanyId,
    currency: result.currency,
    archived: result.archived,
    balance: result.latestBalance,
    balanceDate: result.latestBalanceDate,
    version: result.version,
  };
}
export type Account = ReturnType<typeof mapAccount>;
export function canWriteAccounts(company: Company) {
  return !company.archived && (company.role === "OWNER" || company.role === "ACCOUNTANT");
}

import {
  createAccount,
  createCompany,
  getAccount,
  getCompany,
  listAccounts,
  listCompanies,
} from "@zapas/api/orchestrator";
import { z } from "zod";
import { businessCall } from "@/shared/api/problem.ts";
import {
  accountDraftSchema,
  companyDraftSchema,
  mapAccount,
  mapCompany,
  pageSchema,
  type AccountDraft,
  type CompanyDraft,
} from "../model/schemas.ts";

const quiet: RequestInit & { silent: true } = { silent: true };
const uuid = z.uuid();
const nullable = (value: string) => (value === "" ? null : value);
export const workspaceApi = {
  companies: (page: number, signal: AbortSignal) =>
    businessCall(async () => {
      const result = await listCompanies({ page, size: 10 }, { ...quiet, signal });
      return { items: result.items.map(mapCompany), page: pageSchema.parse(result.page) };
    }),
  company: (companyId: string, signal: AbortSignal) =>
    businessCall(async () => {
      const result = mapCompany(await getCompany(uuid.parse(companyId), { ...quiet, signal }));
      z.literal(companyId).parse(result.id);
      return result;
    }),
  createCompany: (draft: CompanyDraft, key: string) =>
    businessCall(async () => {
      const value = companyDraftSchema.parse(draft);
      return mapCompany(
        await createCompany(
          { ...value, inn: nullable(value.inn), kpp: nullable(value.kpp), timezone: "Europe/Moscow" },
          { "Idempotency-Key": uuid.parse(key) },
          quiet,
        ),
      );
    }),
  accounts: (companyId: string, page: number, signal: AbortSignal) =>
    businessCall(async () => {
      const result = await listAccounts(uuid.parse(companyId), { page, size: 10 }, { ...quiet, signal });
      return {
        items: result.items.map((value) => mapAccount(value, companyId)),
        page: pageSchema.parse(result.page),
      };
    }),
  account: (companyId: string, accountId: string, signal: AbortSignal) =>
    businessCall(async () => {
      const result = mapAccount(
        await getAccount(uuid.parse(companyId), uuid.parse(accountId), { ...quiet, signal }),
        companyId,
      );
      z.literal(accountId).parse(result.id);
      return result;
    }),
  createAccount: (companyId: string, draft: AccountDraft, key: string) =>
    businessCall(async () => {
      const value = accountDraftSchema.parse(draft);
      return mapAccount(
        await createAccount(
          uuid.parse(companyId),
          {
            ...value,
            bankName: nullable(value.bankName),
            accountNumber: nullable(value.accountNumber),
            externalCompanyId: nullable(value.externalCompanyId),
          },
          { "Idempotency-Key": uuid.parse(key) },
          quiet,
        ),
        companyId,
      );
    }),
};

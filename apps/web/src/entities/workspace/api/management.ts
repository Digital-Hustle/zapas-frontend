import {
  archiveAccount,
  archiveCompany,
  createBalanceAnchor,
  updateAccount,
  updateCompany,
} from "@zapas/api/orchestrator";
import { z } from "zod";
import { businessCall } from "@/shared/api/problem.ts";
import {
  accountDraftSchema,
  companyDraftSchema,
  mapAccount,
  mapCompany,
  type AccountDraft,
  type CompanyDraft,
} from "../model/schemas.ts";
import { balanceAnchorSchema, mapBalanceAnchor, type BalanceAnchorDraft } from "../model/balance.ts";

const quiet: RequestInit & { silent: true } = { silent: true };
const uuid = z.uuid();
const nullable = (value: string) => (value === "" ? null : value);
const match = (value: number) => `"${z.number().int().positive().max(Number.MAX_SAFE_INTEGER).parse(value)}"`;
const companyResult = (value: unknown, companyId: string) => {
  const result = mapCompany(value);
  z.literal(companyId).parse(result.id);
  return result;
};
const accountResult = (value: unknown, companyId: string, accountId: string) => {
  const result = mapAccount(value, companyId);
  z.literal(accountId).parse(result.id);
  return result;
};
export const workspaceManagement = {
  updateCompany: (companyId: string, draft: CompanyDraft, version: number) =>
    businessCall(async () => {
      const value = companyDraftSchema.parse(draft);
      return companyResult(
        await updateCompany(
          uuid.parse(companyId),
          {
            ...value,
            inn: nullable(value.inn),
            kpp: nullable(value.kpp),
            timezone: "Europe/Moscow",
          },
          { "If-Match": match(version) },
          quiet,
        ),
        companyId,
      );
    }),
  updateAccount: (companyId: string, accountId: string, draft: AccountDraft, version: number) =>
    businessCall(async () => {
      const value = accountDraftSchema.parse(draft);
      return accountResult(
        await updateAccount(
          uuid.parse(companyId),
          uuid.parse(accountId),
          {
            ...value,
            bankName: nullable(value.bankName),
            accountNumber: nullable(value.accountNumber),
            externalCompanyId: nullable(value.externalCompanyId),
          },
          { "If-Match": match(version) },
          quiet,
        ),
        companyId,
        accountId,
      );
    }),
  archiveCompany: (companyId: string, version: number, key: string) =>
    businessCall(async () =>
      companyResult(
        await archiveCompany(
          uuid.parse(companyId),
          { "If-Match": match(version), "Idempotency-Key": uuid.parse(key) },
          quiet,
        ),
        companyId,
      ),
    ),
  archiveAccount: (companyId: string, accountId: string, version: number, key: string) =>
    businessCall(async () =>
      accountResult(
        await archiveAccount(
          uuid.parse(companyId),
          uuid.parse(accountId),
          { "If-Match": match(version), "Idempotency-Key": uuid.parse(key) },
          quiet,
        ),
        companyId,
        accountId,
      ),
    ),
  anchor: (companyId: string, accountId: string, draft: BalanceAnchorDraft, key: string) =>
    businessCall(async () =>
      mapBalanceAnchor(
        await createBalanceAnchor(
          uuid.parse(companyId),
          uuid.parse(accountId),
          balanceAnchorSchema.parse(draft),
          { "Idempotency-Key": uuid.parse(key) },
          quiet,
        ),
        accountId,
      ),
    ),
};

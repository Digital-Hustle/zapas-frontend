import { z } from "zod";

export function scopeId(value: string | null | undefined) {
  const parsed = z.uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}
export function companyPath(companyId: string, accountId?: string | null) {
  return `/app/company/${z.uuid().parse(companyId)}${accountId ? `?account=${z.uuid().parse(accountId)}` : ""}`;
}
export function accountPath(section: string, companyId: string, accountId: string) {
  return `/app/${section}?company=${z.uuid().parse(companyId)}&account=${z.uuid().parse(accountId)}`;
}

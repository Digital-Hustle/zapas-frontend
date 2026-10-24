/** One account per financial view. No cross-company/account cache reuse. */
export const financialKeys = {
  scope: (companyId: string, accountId: string) => ["financial", companyId, accountId] as const,
};

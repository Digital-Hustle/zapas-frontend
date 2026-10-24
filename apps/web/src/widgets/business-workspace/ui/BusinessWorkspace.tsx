import { useSearchParams, Link, useLocation } from "react-router";
import { useIsMutating } from "@tanstack/react-query";
import { ErrorState, Badge, buttonVariants, cn } from "@zapas/ui";
import { useAccount, useCompany, canWriteAccounts, type Company, type Account } from "@/entities/workspace";
import { usePrivateQueries } from "@/entities/auth-profile";
import { accountPath, companyPath, scopeId } from "@/shared/lib/workspace-path.ts";
import { accessDenied } from "@/shared/api/problem.ts";
import { Loading, QueryIssue } from "@/shared/ui/BusinessData.tsx";
import { Logo } from "@/shared/ui";
import { RecoveryAction } from "./RecoveryAction.tsx";
import { useCommandLock } from "@/shared/lib/pending-commands.ts";
import type { ReactNode } from "react";

export interface BusinessScope {
  company: Company;
  account: Account;
  active: boolean;
  writable: boolean;
  busy: boolean;
  locked: boolean;
  recovery: ReactNode;
}
const sections = [
  ["imports", "Импорт CSV"],
  ["payments", "Операции"],
  ["recurring", "Регулярности"],
] as const;

export function WorkspaceNavigation({ companyId, accountId }: { companyId: string; accountId: string }) {
  const location = useLocation();
  return (
    <nav aria-label="Разделы бизнеса" className="flex flex-wrap gap-2">
      {sections.map(([section, label]) => (
        <Link
          key={section}
          to={accountPath(section, companyId, accountId)}
          aria-current={location.pathname === `/app/${section}` ? "page" : undefined}
          className={cn(
            buttonVariants({
              size: "sm",
              variant: location.pathname === `/app/${section}` ? "soft" : "ghost",
            }),
            "max-w-full",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function BusinessWorkspace({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: (scope: BusinessScope) => ReactNode;
}) {
  const [params] = useSearchParams();
  const companyId = scopeId(params.get("company"));
  const accountId = scopeId(params.get("account"));
  const { privateQueries } = usePrivateQueries();
  const valid = companyId !== null && accountId !== null;
  const company = useCompany(companyId, privateQueries && valid);
  const account = useAccount(companyId ?? "", accountId, privateQueries && valid);
  const busy = useIsMutating() > 0;
  const { locked } = useCommandLock();
  const recovery = <RecoveryAction />;
  const visible =
    Boolean(company.data && account.data) &&
    !(company.isError && accessDenied(company.error)) &&
    !(account.isError && accessDenied(account.error));
  return (
    <div className="bg-background min-h-svh">
      <header className="border-border border-b">
        <div className="max-w-content mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Logo to="/app" />
          <Link to="/app/profile" className={buttonVariants({ size: "sm", variant: "secondary" })}>
            Профиль и сессии
          </Link>
        </div>
      </header>
      <main className="max-w-content mx-auto space-y-6 px-6 py-8">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          {visible && (
            <p className="text-muted-foreground mt-2 break-words">
              {company.data?.name} · {account.data?.name} · RUB
            </p>
          )}
          {description && <p className="text-muted-foreground mt-2 max-w-3xl">{description}</p>}
        </div>
        {!valid && (
          <ErrorState
            title="Выберите бизнес и счёт"
            description="Откройте организацию и выберите рублёвый счёт."
          />
        )}
        {valid && (company.isPending || account.isPending) && <Loading label="Загрузка бизнеса и счёта" />}
        {company.isError && (
          <QueryIssue
            error={company.error}
            saved={Boolean(company.data)}
            pending={company.isFetching}
            onRetry={() => void company.refetch()}
            recovery={recovery}
          />
        )}
        {account.isError && (
          <QueryIssue
            error={account.error}
            saved={Boolean(account.data)}
            pending={account.isFetching}
            onRetry={() => void account.refetch()}
            recovery={recovery}
          />
        )}
        {visible && company.data && account.data && (
          <div key={`${companyId}/${accountId}`} className="space-y-6">
            <WorkspaceNavigation companyId={company.data.id} accountId={account.data.id} />
            {(company.data.archived || account.data.archived) && <Badge>Архив · только просмотр</Badge>}
            {children({
              company: company.data,
              account: account.data,
              active: privateQueries && !company.isError && !account.isError,
              writable:
                privateQueries &&
                !company.isError &&
                !account.isError &&
                !account.data.archived &&
                canWriteAccounts(company.data),
              busy,
              locked,
              recovery,
            })}
            <Link to={companyPath(company.data.id, account.data.id)} className="text-link text-sm underline">
              К выбору счёта и реквизитам бизнеса
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

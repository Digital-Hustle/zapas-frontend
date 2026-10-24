import { Link, useParams, useSearchParams } from "react-router";
import { ErrorState, buttonVariants } from "@zapas/ui";
import { useCompany, workspaceKeys } from "@/entities/workspace";
import { usePrivateQueries } from "@/entities/auth-profile";
import { accessDenied } from "@/shared/api/problem.ts";
import { scopeId } from "@/shared/lib/workspace-path.ts";
import { Logo } from "@/shared/ui";
import { RecoveryAction } from "@/widgets/business-workspace";
import { Accounts } from "./Accounts.tsx";
import { CompanyActions } from "./WorkspaceActions.tsx";
import { Loading, QueryIssue } from "./WorkspaceParts.tsx";

export function CompanyPage() {
  const companyId = scopeId(useParams().companyId);
  const [params, setParams] = useSearchParams();
  const accountId = scopeId(params.get("account"));
  const { privateQueries } = usePrivateQueries();
  const query = useCompany(companyId, privateQueries);
  const recovery = <RecoveryAction queryKey={workspaceKeys.company(companyId ?? "")} />;
  return (
    <div className="bg-background min-h-svh">
      <header className="border-border border-b">
        <div className="max-w-content mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Logo to="/app" />
          <Link to="/app/profile" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Профиль и сессии
          </Link>
        </div>
      </header>
      <main className="max-w-content mx-auto space-y-6 px-6 py-8">
        <h1 className="text-3xl font-semibold break-words">
          {!(query.isError && accessDenied(query.error))
            ? (query.data?.name ?? "Рабочее пространство бизнеса")
            : "Рабочее пространство бизнеса"}
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Выберите счёт, загрузите выписку и откройте прогноз. Все разделы работают с одним выбранным счётом.
        </p>
        {(!companyId || (params.has("account") && !accountId)) && (
          <ErrorState title="Некорректная ссылка" description="Выберите бизнес и счёт из списка." />
        )}
        {companyId && query.isPending && <Loading label="Загрузка выбранной организации" />}
        {query.isError && (
          <QueryIssue
            error={query.error}
            saved={Boolean(query.data)}
            pending={query.isFetching}
            onRetry={() => void query.refetch()}
            recovery={recovery}
          />
        )}
        {query.data && !(query.isError && accessDenied(query.error)) && (
          <div className="space-y-6" key={query.data.id}>
            <Accounts
              company={query.data}
              accountId={accountId}
              onAccount={(id) => setParams({ account: id })}
              stale={query.isError}
              recovery={recovery}
            />
            <CompanyActions company={query.data} stale={query.isError} recovery={recovery} />
          </div>
        )}
      </main>
    </div>
  );
}

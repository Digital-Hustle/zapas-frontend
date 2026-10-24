import { useCallback, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button, EmptyState, ErrorState, buttonVariants, notify } from "@zapas/ui";
import { resetPrivateSession, usePrivateQueries, useSessionRecovery } from "@/entities/auth-profile";
import { canWriteAccounts, useCompany, useAccount, type Company, type Account } from "@/entities/workspace";
import { useImports, importKeys } from "@/entities/imports";
import { UploadForm } from "@/features/upload-statement";
import { accessDenied } from "@/shared/api/problem.ts";
import { Logo } from "@/shared/ui";
import { Loading, Pagination, QueryIssue } from "@/shared/ui/BusinessData.tsx";
import { ImportReport, ImportSummary } from "./ImportReport.tsx";

function ImportWorkspace({
  company,
  account,
  stale,
  recovery,
}: {
  company: Company;
  account: Account;
  stale: boolean;
  recovery: ReactNode;
}) {
  const client = useQueryClient();
  const { privateQueries } = usePrivateQueries();
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const history = useImports(company.id, account.id, page, privateQueries);
  const busy = useIsMutating() > 0;
  const writable =
    privateQueries &&
    !stale &&
    !account.archived &&
    canWriteAccounts(company) &&
    company.permissions.canImport &&
    !(history.isError && accessDenied(history.error));
  const selectReport = useCallback((id: string) => setSelected(id), []);
  return (
    <div className="space-y-8">
      {writable ? (
        <UploadForm
          company={company}
          account={account}
          recovery={recovery}
          onReport={selectReport}
          onImported={(value) => setSelected(value.id)}
        />
      ) : (
        <p role="status" className="text-muted-foreground">
          Загрузка сейчас недоступна. История импорта доступна в пределах ваших прав.
        </p>
      )}
      <section aria-labelledby="import-history" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="import-history" className="text-xl font-semibold">
            История импорта
          </h2>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            loading={history.isFetching}
            onClick={() =>
              void client.invalidateQueries({ queryKey: importKeys.scope(company.id, account.id) })
            }
          >
            Обновить историю
          </Button>
        </div>
        {history.isPending && <Loading label="Загрузка истории импорта" />}
        {history.isError && (
          <QueryIssue
            error={history.error}
            saved={Boolean(history.data) && !accessDenied(history.error)}
            pending={history.isFetching}
            onRetry={() => void history.refetch()}
            recovery={recovery}
          />
        )}
        {history.data && !(history.isError && accessDenied(history.error)) && (
          <>
            {history.data.items.length === 0 ? (
              <EmptyState
                title={page === 0 ? "Для этого счёта ещё нет импортов" : "На этой странице нет импортов"}
                description={
                  writable
                    ? "Выберите CSV выше, чтобы загрузить историю операций."
                    : "Загрузку выполняет владелец или бухгалтер с соответствующим правом."
                }
              />
            ) : (
              <ul className="space-y-4">
                {history.data.items.map((value) => (
                  <li key={value.id} className="border-border bg-card space-y-4 rounded-lg border p-5 sm:p-6">
                    <ImportSummary value={value} />
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        client.setQueryData(importKeys.report(company.id, account.id, value.id), value);
                        setSelected(value.id);
                      }}
                      aria-label={`Открыть отчёт ${value.fileName}`}
                    >
                      Открыть отчёт
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <Pagination page={history.data.page} pending={history.isFetching || busy} onChange={setPage} />
          </>
        )}
      </section>
      {selected && !(history.isError && accessDenied(history.error)) && (
        <ImportReport
          key={selected}
          companyId={company.id}
          accountId={account.id}
          importId={selected}
          recovery={recovery}
        />
      )}
    </div>
  );
}

export function ImportsPage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { privateQueries, setPrivateQueries } = usePrivateQueries();
  const companyId = z.uuid().safeParse(params.get("company")).success ? params.get("company") : null;
  const accountId = z.uuid().safeParse(params.get("account")).success ? params.get("account") : null;
  const scopeValid = companyId !== null && accountId !== null;
  const company = useCompany(companyId, privateQueries && scopeValid);
  const account = useAccount(companyId ?? "", accountId, privateQueries && scopeValid);
  const end = useCallback(async () => {
    setPrivateQueries(false);
    await resetPrivateSession(client, null);
    void navigate("/login", { replace: true });
  }, [client, navigate, setPrivateQueries]);
  const recovery = useSessionRecovery(end);
  const recoveryAction = (
    <div className="mt-3 flex flex-wrap gap-3">
      <Button
        size="sm"
        variant="secondary"
        loading={recovery.isPending}
        onClick={() =>
          recovery.mutate(undefined, {
            onSuccess: () => {
              void client.invalidateQueries();
              notify.success("Сессия обновлена. Повторите нужное действие.");
            },
          })
        }
      >
        Обновить сессию
      </Button>
      <Link to="/login" className="text-link underline">
        Войти снова
      </Link>
    </div>
  );
  const back = companyId && accountId ? `/app?company=${companyId}&account=${accountId}` : "/app";
  return (
    <div className="bg-background min-h-svh">
      <header className="border-border border-b">
        <div className="max-w-content mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Logo to="/app" />
          <Link to={back} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            К организации и счёту
          </Link>
        </div>
      </header>
      <main className="max-w-content mx-auto space-y-8 px-6 py-8">
        <div>
          <h1 className="text-3xl font-semibold">Импорт выписки</h1>
          <p className="text-muted-foreground mt-2">
            История операций загружается для одной выбранной организации и отдельного счёта.
          </p>
        </div>
        {!companyId || !accountId ? (
          <ErrorState
            title="Выберите организацию и счёт"
            description="Перейдите к списку организаций и выберите счёт перед импортом."
          />
        ) : (
          <>
            {(company.isPending || account.isPending) && <Loading label="Загрузка организации и счёта" />}
            {company.isError && (
              <QueryIssue
                error={company.error}
                saved={Boolean(company.data) && !accessDenied(company.error)}
                pending={company.isFetching}
                onRetry={() => void company.refetch()}
                recovery={recoveryAction}
              />
            )}
            {account.isError && (
              <QueryIssue
                error={account.error}
                saved={Boolean(account.data) && !accessDenied(account.error)}
                pending={account.isFetching}
                onRetry={() => void account.refetch()}
                recovery={recoveryAction}
              />
            )}
            {company.data &&
              account.data &&
              !(company.isError && accessDenied(company.error)) &&
              !(account.isError && accessDenied(account.error)) && (
                <ImportWorkspace
                  key={`${companyId}/${accountId}`}
                  company={company.data}
                  account={account.data}
                  stale={company.isError || account.isError}
                  recovery={recoveryAction}
                />
              )}
          </>
        )}
      </main>
    </div>
  );
}

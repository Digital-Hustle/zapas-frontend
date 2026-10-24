import { roleName, legalForm } from "./labels.ts";
import { useCallback, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Badge, Button, EmptyState, ErrorState, buttonVariants, notify } from "@zapas/ui";
import { resetPrivateSession, usePrivateQueries, useSessionRecovery } from "@/entities/auth-profile";
import { useCompanies, useCompany, workspaceKeys, type Company } from "@/entities/workspace";
import { CreateCompanyForm } from "@/features/create-workspace";
import { accessDenied } from "@/shared/api/problem.ts";
import { Logo } from "@/shared/ui";
import { Accounts } from "./Accounts.tsx";
import { CompanyActions } from "./WorkspaceActions.tsx";
import { QueryIssue, Loading, Pagination } from "./WorkspaceParts.tsx";

function scopeId(value: string | null) {
  return z.uuid().safeParse(value).success ? value : null;
}

export function DashboardPage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { privateQueries, setPrivateQueries } = usePrivateQueries();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const companyId = scopeId(params.get("company"));
  const accountId = scopeId(params.get("account"));
  const companies = useCompanies(page, privateQueries);
  const selected = useCompany(companyId, privateQueries);
  const busy = useIsMutating() > 0;
  const end = useCallback(async () => {
    setPrivateQueries(false);
    await resetPrivateSession(client, null);
    void navigate("/login", { replace: true });
  }, [client, navigate, setPrivateQueries]);
  const recovery = useSessionRecovery(end);
  const recoveryAction = (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        loading={recovery.isPending}
        disabled={busy}
        onClick={() =>
          recovery.mutate(undefined, {
            onSuccess: () => {
              void client.invalidateQueries({ queryKey: ["workspace"] });
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
  const chooseCompany = (company: Company) => {
    client.setQueryData(workspaceKeys.company(company.id), company);
    setParams({ company: company.id });
  };
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
      <main className="max-w-content mx-auto flex flex-col gap-8 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Организации и счета</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Выберите организацию и отдельный рублёвый счёт. Данные и прогнозы разных счетов не суммируются.
            </p>
          </div>
          <Button disabled={busy} onClick={() => setCreating(true)}>
            Создать организацию
          </Button>
        </div>
        {((params.has("company") && !companyId) || (params.has("account") && !accountId)) && (
          <ErrorState title="Некорректная ссылка" description="Выберите организацию и счёт из списка." />
        )}
        <section aria-labelledby="companies-title" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="companies-title" className="text-xl font-semibold">
              Ваши организации
            </h2>
            <Button
              variant="ghost"
              size="sm"
              loading={companies.isFetching}
              disabled={busy}
              onClick={() => void client.invalidateQueries({ queryKey: ["workspace"] })}
            >
              Обновить организации
            </Button>
          </div>
          {companies.isPending && <Loading label="Загрузка организаций" />}
          {companies.isError && (
            <QueryIssue
              error={companies.error}
              saved={Boolean(companies.data)}
              pending={companies.isFetching}
              onRetry={() => void companies.refetch()}
              recovery={recoveryAction}
            />
          )}
          {companies.data?.items.length === 0 && (
            <EmptyState
              title={page === 0 ? "У вас пока нет организаций" : "На этой странице нет организаций"}
              description={
                page === 0
                  ? "Создайте организацию, затем добавьте её счёт."
                  : "Вернитесь на предыдущую страницу или обновите список."
              }
            />
          )}
          {companies.data && !(companies.isError && accessDenied(companies.error)) && (
            <>
              <ul className="grid gap-4 md:grid-cols-2">
                {companies.data.items.map((company) => (
                  <li
                    key={company.id}
                    className="border-border bg-card flex min-w-0 flex-col gap-4 rounded-lg border p-5"
                  >
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold break-words">{company.name}</h3>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {legalForm[company.legalForm]} · {roleName[company.role]}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {company.archived && <Badge>В архиве</Badge>}
                      {company.id === companyId && <Badge tone="success">Выбрана</Badge>}
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-fit"
                        aria-label={`Выбрать организацию ${company.name}`}
                        onClick={() => chooseCompany(company)}
                        disabled={busy}
                      >
                        Выбрать
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination
                page={companies.data.page}
                pending={companies.isFetching || busy}
                onChange={setPage}
              />
            </>
          )}
        </section>
        {companyId && selected.isPending && <Loading label="Загрузка выбранной организации" />}
        {companyId && selected.isError && (
          <QueryIssue
            error={selected.error}
            saved={Boolean(selected.data)}
            pending={selected.isFetching}
            onRetry={() => void selected.refetch()}
            recovery={recoveryAction}
          />
        )}
        {selected.data &&
          !(companies.isError && accessDenied(companies.error)) &&
          !(selected.isError && accessDenied(selected.error)) && (
            <div className="space-y-6" key={selected.data.id}>
              <CompanyActions company={selected.data} stale={selected.isError} recovery={recoveryAction} />
              <Accounts
                key={selected.data.id}
                company={selected.data}
                accountId={accountId}
                stale={selected.isError}
                recovery={recoveryAction}
                onAccount={(id) => setParams({ company: selected.data.id, account: id })}
              />
            </div>
          )}
        {!companyId && companies.data && companies.data.items.length > 0 && (
          <p role="status" className="text-muted-foreground">
            Выберите организацию, чтобы увидеть её счета.
          </p>
        )}
        {creating && (
          <CreateCompanyForm
            recovery={recoveryAction}
            onClose={() => setCreating(false)}
            onCreated={(value) => {
              chooseCompany(value);
              setCreating(false);
            }}
          />
        )}
      </main>
    </div>
  );
}

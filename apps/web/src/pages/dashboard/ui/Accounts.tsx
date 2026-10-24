import { roleName } from "./labels.ts";
import { useState, type ReactNode } from "react";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { Amount, Badge, Button, EmptyState } from "@zapas/ui";
import { usePrivateQueries } from "@/entities/auth-profile";
import { canWriteAccounts, useAccount, useAccounts, workspaceKeys, type Company } from "@/entities/workspace";
import { accessDenied } from "@/shared/api/problem.ts";
import { CreateAccountForm } from "@/features/create-workspace";
import { QueryIssue, Loading, Pagination } from "./WorkspaceParts.tsx";
import { AccountActions } from "./WorkspaceActions.tsx";

export function Accounts({
  company,
  accountId,
  onAccount,
  recovery,
  stale,
}: {
  company: Company;
  accountId: string | null;
  onAccount: (id: string) => void;
  recovery: ReactNode;
  stale: boolean;
}) {
  const client = useQueryClient();
  const { privateQueries } = usePrivateQueries();
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const accounts = useAccounts(company.id, page, privateQueries);
  const selected = useAccount(company.id, accountId, privateQueries);
  const busy = useIsMutating() > 0;
  const writable = canWriteAccounts(company) && !stale && !(accounts.isError && accessDenied(accounts.error));
  return (
    <section aria-labelledby="accounts-title" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="accounts-title" className="text-xl font-semibold break-words">
            Счета: {company.name}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{roleName[company.role]} · Москва · RUB</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            loading={accounts.isFetching}
            disabled={busy}
            onClick={() => void accounts.refetch()}
          >
            Обновить счета
          </Button>
          {writable && (
            <Button size="sm" disabled={busy} onClick={() => setCreating(true)}>
              Добавить счёт
            </Button>
          )}
        </div>
      </div>
      {company.archived && (
        <p role="status" className="text-muted-foreground">
          Организация в архиве. Доступен просмотр сохранённых данных.
        </p>
      )}
      {!canWriteAccounts(company) && !company.archived && (
        <p role="status" className="text-muted-foreground">
          Доступен только просмотр. Для добавления счёта обратитесь к владельцу или бухгалтеру.
        </p>
      )}
      {accounts.isPending && <Loading label="Загрузка счетов" />}
      {accounts.isError && (
        <QueryIssue
          error={accounts.error}
          saved={Boolean(accounts.data)}
          pending={accounts.isFetching}
          onRetry={() => void accounts.refetch()}
          recovery={recovery}
        />
      )}
      {accounts.data?.items.length === 0 && (
        <EmptyState
          title={page === 0 ? "У организации пока нет счетов" : "На этой странице нет счетов"}
          description={
            writable
              ? "Добавьте RUB-счёт для истории операций и прогноза."
              : "Попросите владельца или бухгалтера добавить счёт."
          }
        />
      )}
      {accounts.data && !(accounts.isError && accessDenied(accounts.error)) && (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {accounts.data.items.map((account) => (
              <li
                key={account.id}
                className="border-border bg-card flex min-w-0 flex-col gap-4 rounded-lg border p-5"
              >
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold break-words">{account.name}</h3>
                  <p className="text-muted-foreground mt-1 text-sm break-words">
                    {account.bankName ?? "Банк не указан"} · RUB
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {account.archived && <Badge>В архиве</Badge>}
                  {account.id === accountId && <Badge tone="success">Выбран</Badge>}
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Выбрать счёт ${account.name}`}
                    disabled={busy}
                    onClick={() => {
                      client.setQueryData(workspaceKeys.account(company.id, account.id), account);
                      onAccount(account.id);
                    }}
                  >
                    Выбрать
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={accounts.data.page} pending={accounts.isFetching || busy} onChange={setPage} />
        </>
      )}
      {accountId && selected.isPending && <Loading label="Загрузка выбранного счёта" />}
      {accountId && selected.isError && (
        <QueryIssue
          error={selected.error}
          saved={Boolean(selected.data)}
          pending={selected.isFetching}
          onRetry={() => void selected.refetch()}
          recovery={recovery}
        />
      )}
      {selected.data &&
        !(accounts.isError && accessDenied(accounts.error)) &&
        !(selected.isError && accessDenied(selected.error)) && (
          <section
            aria-labelledby="selected-account"
            className="border-border bg-card rounded-lg border p-5 sm:p-6"
          >
            <h3 id="selected-account" className="text-lg font-semibold break-words">
              Выбранный счёт: {selected.data.name}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm break-all">
              Номер: {selected.data.accountNumber ?? "Не указан"}
            </p>
            <p className="text-muted-foreground mt-2 text-sm break-words">
              ID компании в выписке: {selected.data.externalCompanyId ?? "Не указан"}
            </p>
            <p className="mt-4 text-sm">Подтверждённый остаток</p>
            {selected.data.balance === null ? (
              <p className="text-muted-foreground mt-2">Подтверждённый остаток пока не задан.</p>
            ) : (
              <div className="mt-2 flex flex-wrap items-baseline gap-3">
                <Amount
                  value={selected.data.balance}
                  animated={false}
                  className="text-xl font-semibold break-all"
                />
                <p className="text-muted-foreground text-sm">
                  на {selected.data.balanceDate ?? "неизвестную дату"}
                </p>
              </div>
            )}
            {selected.data.archived && (
              <p className="text-muted-foreground mt-3">Счёт в архиве. Доступен просмотр.</p>
            )}
            <AccountActions
              key={selected.data.id}
              company={company}
              account={selected.data}
              stale={stale || accounts.isError || selected.isError}
              recovery={recovery}
            />
          </section>
        )}
      {creating && writable && (
        <CreateAccountForm
          company={company}
          recovery={recovery}
          onClose={() => setCreating(false)}
          onCreated={(value) => {
            onAccount(value.id);
            setCreating(false);
          }}
        />
      )}
    </section>
  );
}

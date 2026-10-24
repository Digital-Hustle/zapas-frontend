import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Amount,
  Button,
  EmptyState,
  ErrorState,
  Table,
  buttonVariants,
  notify,
  type ColumnDef,
  type RowSelectionState,
} from "@zapas/ui";
import { resetPrivateSession, usePrivateQueries, useSessionRecovery } from "@/entities/auth-profile";
import { canWriteAccounts, useCompany, useAccount, type Company, type Account } from "@/entities/workspace";
import {
  usePayments,
  useCategories,
  preparePaymentFilters,
  type Payment,
  type PaymentFilters,
} from "@/entities/payments";
import { BulkCategoryForm } from "@/features/change-payment-category";
import { financialKeys } from "@/shared/api/financialKeys.ts";
import { accessDenied } from "@/shared/api/problem.ts";
import { Logo } from "@/shared/ui";
import { WorkspaceNavigation } from "@/widgets/business-workspace";
import { companyPath } from "@/shared/lib/workspace-path.ts";
import { Loading, Pagination, QueryIssue } from "@/shared/ui/BusinessData.tsx";
import { initialPaymentFilters } from "../model/filters.ts";
import { PaymentFiltersForm } from "./PaymentFilters.tsx";
import { PaymentDetail } from "./PaymentDetail.tsx";

function PaymentsWorkspace({
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
  const [filters, setFilters] = useState<PaymentFilters>(() => preparePaymentFilters(initialPaymentFilters));
  const [page, setPage] = useState(0);
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const rows = usePayments(company.id, account.id, filters, page, privateQueries);
  const categories = useCategories(company.id, privateQueries);
  const categoryData = categories.isError && accessDenied(categories.error) ? [] : (categories.data ?? []);
  useEffect(() => {
    if ((rows.isError && accessDenied(rows.error)) || (categories.isError && accessDenied(categories.error)))
      void client.invalidateQueries({ queryKey: ["workspace"] });
  }, [client, rows.isError, rows.error, categories.isError, categories.error]);
  const busy = useIsMutating() > 0;
  const writable =
    privateQueries &&
    !stale &&
    !account.archived &&
    canWriteAccounts(company) &&
    company.permissions.canEditPayments &&
    !rows.isError &&
    !categories.isError &&
    Boolean(categories.data);
  const filtered = Object.keys(filters).some((key) => key !== "sort");
  const choose = (payment: Payment) => {
    setSelected(payment.id);
  };
  const columns: ColumnDef<Payment>[] = [
    { accessorKey: "operationDate", header: "Дата" },
    {
      id: "direction",
      header: "Направление",
      cell: ({ row }) =>
        row.original.direction === "IN"
          ? "Поступление"
          : row.original.direction === "OUT"
            ? "Списание"
            : "Неизвестно",
    },
    {
      id: "counterparty",
      header: "Контрагент",
      cell: ({ row }) => (
        <div className="max-w-xs break-words">
          <p>{row.original.counterpartyName ?? "Не указан"}</p>
          <p className="text-muted-foreground">{row.original.counterpartyInn ?? "ИНН не указан"}</p>
        </div>
      ),
    },
    {
      id: "category",
      header: "Категория",
      cell: ({ row }) =>
        categoryData.find((category) => category.code === row.original.categoryCode)?.name ??
        `Неизвестная (${row.original.categoryCode})`,
    },
    {
      id: "amount",
      header: "Сумма, ₽",
      cell: ({ row }) => (
        <Amount value={row.original.amount} animated={false} className="block min-w-32 text-right" />
      ),
    },
    {
      id: "details",
      header: "Подробности",
      cell: ({ row }) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => choose(row.original)}
          aria-label={`Открыть операцию ${row.original.operationDate} ${row.original.counterpartyName ?? "без контрагента"}`}
        >
          Открыть
        </Button>
      ),
    },
  ];
  const picked = rows.data?.items.filter((value) => selection[value.id]) ?? [];
  return (
    <div className="space-y-6">
      <PaymentFiltersForm
        companyId={company.id}
        accountId={account.id}
        categories={categoryData}
        active={privateQueries}
        busy={busy}
        onChange={(value) => {
          setFilters(value);
          setPage(0);
          setSelection({});
          setSelected(null);
        }}
      />
      {categories.isError && (
        <QueryIssue
          error={categories.error}
          saved={Boolean(categories.data) && !accessDenied(categories.error)}
          pending={categories.isFetching}
          onRetry={() => void categories.refetch()}
          recovery={recovery}
        />
      )}
      <section aria-labelledby="payments-title" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="payments-title" className="text-xl font-semibold">
            Операции счёта
          </h2>
          <Button
            variant="secondary"
            size="sm"
            loading={rows.isFetching}
            disabled={busy}
            onClick={() =>
              void client.invalidateQueries({ queryKey: financialKeys.scope(company.id, account.id) })
            }
          >
            Обновить операции
          </Button>
        </div>
        {!writable && (
          <p role="status" className="text-muted-foreground text-sm">
            Просмотр операций. Изменение категорий сейчас недоступно.
          </p>
        )}
        {rows.isError && (
          <QueryIssue
            error={rows.error}
            saved={Boolean(rows.data) && !accessDenied(rows.error)}
            pending={rows.isFetching}
            onRetry={() => void rows.refetch()}
            recovery={recovery}
          />
        )}
        {!(rows.isError && accessDenied(rows.error)) && (
          <>
            {writable && (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-muted-foreground text-sm">
                  Выбрано на странице: {picked.length}. При смене фильтров или страницы выбор сбрасывается.
                </p>
                <Button
                  size="sm"
                  disabled={busy || rows.isFetching || picked.length === 0}
                  onClick={() => setBulk(true)}
                >
                  Изменить категории выбранных
                </Button>
              </div>
            )}
            <fieldset disabled={busy || rows.isFetching} className="min-w-0">
              <Table
                label="Банковские операции выбранного счёта"
                data={rows.data?.items ?? []}
                columns={columns}
                getRowId={(row) => row.id}
                loading={rows.isPending}
                manualSorting
                filtered={filtered}
                selection={selection}
                onSelectionChange={writable ? setSelection : undefined}
                empty={
                  <EmptyState
                    title={filtered ? "Нет операций по фильтрам" : "Пока нет операций"}
                    description={
                      filtered
                        ? "Измените период, направление, категорию или поиск."
                        : "Загрузите историю CSV для выбранного счёта."
                    }
                    filtered={filtered}
                  />
                }
              />
            </fieldset>
            {rows.data && (
              <Pagination
                page={rows.data.page}
                pending={rows.isFetching || busy}
                onChange={(value) => {
                  setPage(value);
                  setSelection({});
                  setSelected(null);
                }}
              />
            )}
          </>
        )}
      </section>
      {selected && !(rows.isError && accessDenied(rows.error)) && (
        <PaymentDetail
          companyId={company.id}
          accountId={account.id}
          paymentId={selected}
          categories={categoryData}
          writable={writable}
          recovery={recovery}
          onClose={() => setSelected(null)}
        />
      )}
      {bulk && writable && picked.length > 0 && (
        <BulkCategoryForm
          companyId={company.id}
          accountId={account.id}
          payments={picked}
          categories={categoryData}
          recovery={recovery}
          onClose={() => {
            setBulk(false);
            setSelection({});
          }}
        />
      )}
    </div>
  );
}

export function PaymentsPage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { privateQueries, setPrivateQueries } = usePrivateQueries();
  const companyId = z.uuid().safeParse(params.get("company")).success ? params.get("company") : null;
  const accountId = z.uuid().safeParse(params.get("account")).success ? params.get("account") : null;
  const valid = companyId !== null && accountId !== null;
  const company = useCompany(companyId, privateQueries && valid);
  const account = useAccount(companyId ?? "", accountId, privateQueries && valid);
  const end = useCallback(async () => {
    setPrivateQueries(false);
    await resetPrivateSession(client, null);
    void navigate("/login", { replace: true });
  }, [client, navigate, setPrivateQueries]);
  const recovery = useSessionRecovery(end);
  const recoveryAction = (
    <div className="mt-3 flex flex-wrap gap-3">
      <Button
        variant="secondary"
        size="sm"
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
  return (
    <div className="bg-background min-h-svh">
      <header className="border-border border-b">
        <div className="max-w-content mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Logo to="/app" />
          <Link
            to={valid ? companyPath(companyId, accountId) : "/app"}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            К организации и счёту
          </Link>
        </div>
      </header>
      <main className="max-w-content mx-auto space-y-8 px-6 py-8">
        <div>
          <h1 className="text-3xl font-semibold">Операции</h1>
          <p className="text-muted-foreground mt-2 break-words">
            {company.data &&
            account.data &&
            !(company.isError && accessDenied(company.error)) &&
            !(account.isError && accessDenied(account.error))
              ? `${company.data.name} · ${account.data.name} · RUB`
              : "История выбранного счёта"}
          </p>
        </div>
        {!valid ? (
          <ErrorState
            title="Выберите организацию и счёт"
            description="Перейдите к списку организаций и выберите отдельный счёт."
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
                <div className="space-y-6">
                  <WorkspaceNavigation companyId={company.data.id} accountId={account.data.id} />
                  <PaymentsWorkspace
                    key={`${companyId}/${accountId}`}
                    company={company.data}
                    account={account.data}
                    stale={company.isError || account.isError}
                    recovery={recoveryAction}
                  />
                </div>
              )}
          </>
        )}
      </main>
    </div>
  );
}

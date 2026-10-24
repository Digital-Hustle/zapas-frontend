import type { ReactNode } from "react";
import { useIsMutating } from "@tanstack/react-query";
import { Amount, Dialog } from "@zapas/ui";
import { usePrivateQueries } from "@/entities/auth-profile";
import { usePayment, type Category } from "@/entities/payments";
import { ChangeCategoryForm } from "@/features/change-payment-category";
import { accessDenied } from "@/shared/api/problem.ts";
import { Loading, QueryIssue } from "@/shared/ui/BusinessData.tsx";

export function PaymentDetail({
  companyId,
  accountId,
  paymentId,
  categories,
  writable,
  recovery,
  onClose,
}: {
  companyId: string;
  accountId: string;
  paymentId: string;
  categories: Category[];
  writable: boolean;
  recovery: ReactNode;
  onClose: () => void;
}) {
  const { privateQueries } = usePrivateQueries();
  const query = usePayment(companyId, accountId, paymentId, privateQueries);
  const busy = useIsMutating() > 0;
  const value = query.data;
  return (
    <Dialog
      open
      busy={busy}
      title="Операция выписки"
      description="Факт из импортированной банковской истории."
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {query.isPending && <Loading label="Загрузка операции" />}
      {query.isError && (
        <QueryIssue
          error={query.error}
          saved={Boolean(value) && !accessDenied(query.error)}
          pending={query.isFetching}
          onRetry={() => void query.refetch()}
          recovery={recovery}
        />
      )}
      {value && !(query.isError && accessDenied(query.error)) && (
        <div className="space-y-4 text-sm">
          <p>
            {value.operationDate} ·{" "}
            {value.direction === "IN"
              ? "Поступление"
              : value.direction === "OUT"
                ? "Списание"
                : "Тип операции не распознан"}
          </p>
          <Amount value={value.amount} animated={false} className="text-2xl font-semibold break-all" />
          <p className="break-words">Контрагент: {value.counterpartyName ?? "Не указан"}</p>
          <p className="break-all">ИНН: {value.counterpartyInn ?? "Не указан"}</p>
          <p className="break-words">Назначение: {value.purpose ?? "Не указано"}</p>
          <p className="break-words">
            Категория:{" "}
            {categories.find((category) => category.code === value.categoryCode)?.name ??
              `Неизвестная (${value.categoryCode})`}
          </p>
          <p className="text-muted-foreground">
            Источник категории:{" "}
            {value.categorySource === "USER"
              ? "Изменено вручную"
              : value.categorySource === "RULE"
                ? "Правило"
                : value.categorySource === "COUNTERPARTY"
                  ? "По контрагенту"
                  : value.categorySource === "OTHER"
                    ? "Не распознана"
                    : "Неизвестен"}
          </p>
          <div className="border-border space-y-2 border-t pt-4">
            <p>
              Остаток на конец дня:{" "}
              {value.balanceEod === null ? (
                "Нет данных"
              ) : (
                <Amount value={value.balanceEod} animated={false} />
              )}
            </p>
            <p>
              Сопоставлено с планами: <Amount value={value.allocatedAmount} animated={false} />
            </p>
          </div>
          {writable && query.isFetchedAfterMount && value.direction !== "UNKNOWN" && (
            <ChangeCategoryForm
              key={value.id}
              payment={value}
              categories={categories}
              active={!query.isError && !query.isFetching}
              recovery={recovery}
              onSaved={onClose}
            />
          )}
          {!writable && (
            <p className="text-muted-foreground">Доступен просмотр. Изменение категории сейчас недоступно.</p>
          )}
        </div>
      )}
    </Dialog>
  );
}

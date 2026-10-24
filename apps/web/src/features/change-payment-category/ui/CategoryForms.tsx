import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating, useQuery, useQueryClient } from "@tanstack/react-query";
import { Amount, Button, Dialog, Field, Select, confirmDialog, notify } from "@zapas/ui";
import { usePrivateQueries } from "@/entities/auth-profile";
import {
  categoryDraftSchema,
  paymentsApi,
  paymentKeys,
  type Category,
  type CategoryDraft,
  type BulkCategoryDraft,
  type Payment,
} from "@/entities/payments";
import { financialKeys } from "@/shared/api/financialKeys.ts";
import { businessIssue, type BusinessIssue } from "@/shared/api/problem.ts";
import { usePostCommand } from "@/shared/api/usePostCommand.ts";
import { useVersionedEdit } from "@/shared/api/useVersionedEdit.ts";

function usePermissionRefresh(issue: BusinessIssue | null) {
  const client = useQueryClient();
  useEffect(() => {
    if (issue?.kind === "forbidden" || issue?.kind === "not-found")
      void client.invalidateQueries({ queryKey: ["workspace"] });
  }, [client, issue?.kind]);
}
function Issue({ issue, recovery }: { issue: BusinessIssue | null; recovery: ReactNode }) {
  return (
    issue && (
      <div role="alert" className="text-danger space-y-2 text-sm">
        <p>{issue.message}</p>
        {["refresh-uncertain", "unauthorized"].includes(issue.kind) && recovery}
      </div>
    )
  );
}
function currentCategory(payment: Payment, categories: Category[]) {
  return (
    categories.find((value) => value.code === payment.categoryCode)?.name ??
    `Неизвестная категория (${payment.categoryCode})`
  );
}
export function ChangeCategoryForm({
  payment,
  categories,
  active,
  recovery,
  onSaved,
}: {
  payment: Payment;
  categories: Category[];
  active: boolean;
  recovery: ReactNode;
  onSaved: () => void;
}) {
  const id = useId();
  const client = useQueryClient();
  const { privateQueries } = usePrivateQueries();
  const form = useForm<CategoryDraft>({
    resolver: zodResolver(categoryDraftSchema),
    defaultValues: { categoryCode: payment.categoryCode },
  });
  const chosen = useWatch({ control: form.control, name: "categoryCode" });
  const options = categories.filter((value) => value.directions.includes(payment.direction));
  const editor = useVersionedEdit({
    resource: payment,
    queryKey: [...paymentKeys.payment(payment.companyId, payment.accountId, payment.id), "conflict"],
    active: privateQueries && active,
    read: (signal) => paymentsApi.payment(payment.companyId, payment.accountId, payment.id, signal),
    write: (value: CategoryDraft, version) =>
      paymentsApi.category(payment.companyId, payment.accountId, payment.id, value, version),
    onSaved: (value) => {
      client.setQueryData(paymentKeys.payment(payment.companyId, payment.accountId, payment.id), value);
      void client.invalidateQueries({ queryKey: financialKeys.scope(payment.companyId, payment.accountId) });
      onSaved();
    },
  });
  usePermissionRefresh(editor.issue);
  usePermissionRefresh(editor.current.isError ? businessIssue(editor.current.error) : null);
  const busy = useIsMutating() > 0;
  const available = options.some((value) => value.code === chosen) && payment.direction !== "UNKNOWN";
  const fresh = editor.current.data;
  const freshAvailable = Boolean(fresh && fresh.direction !== "UNKNOWN");
  return (
    <form
      noValidate
      className="mt-5 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (available) void form.handleSubmit(editor.submit)(event);
      }}
    >
      <Controller
        name="categoryCode"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field
            htmlFor={`${id}-category`}
            label="Новая категория"
            error={fieldState.error?.message ?? editor.issue?.fields?.categoryCode}
          >
            <Select
              id={`${id}-category`}
              ref={field.ref}
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              disabled={busy || editor.blocked || !privateQueries || !active}
              options={options.map((value) => ({ value: value.code, label: value.name }))}
              invalid={Boolean(fieldState.error ?? editor.issue?.fields?.categoryCode)}
              aria-describedby={
                (fieldState.error ?? editor.issue?.fields?.categoryCode) ? `${id}-category-error` : undefined
              }
            />
          </Field>
        )}
      />
      <p className="text-muted-foreground text-sm">
        Изменяется только категория. Сумма, дата и направление операции из выписки остаются прежними.
      </p>
      <Issue issue={editor.issue} recovery={recovery} />
      {editor.blocked && (
        <div className="border-border bg-warning-soft text-warning-soft-foreground space-y-3 rounded-md border p-4 text-sm">
          <p role="alert">Операция изменилась или результат записи неизвестен. Ваш выбор сохранён.</p>
          {editor.current.isFetching && <p role="status">Читаем актуальную операцию…</p>}
          {editor.current.isError && (
            <Issue issue={businessIssue(editor.current.error)} recovery={recovery} />
          )}
          <Button
            size="sm"
            variant="secondary"
            loading={editor.current.isFetching}
            disabled={busy || !privateQueries || !active}
            onClick={() => void editor.current.refetch()}
          >
            Перечитать операцию
          </Button>
          {fresh && !editor.current.isFetching && !editor.current.isError && (
            <>
              <p>Актуальная категория: {currentCategory(fresh, categories)}</p>
              {freshAvailable ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!privateQueries || !active}
                    onClick={() => {
                      editor.choose();
                    }}
                  >
                    Оставить мой выбор
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!privateQueries || !active}
                    onClick={() => {
                      const value = editor.choose();
                      if (value) form.reset({ categoryCode: value.categoryCode });
                    }}
                  >
                    Загрузить актуальную категорию
                  </Button>
                </div>
              ) : (
                <p>Тип операции не поддерживается. Запись недоступна.</p>
              )}
            </>
          )}
        </div>
      )}
      {editor.message && (
        <p role="status" className="text-muted-foreground text-sm">
          {editor.message}
        </p>
      )}
      <Button
        type="submit"
        loading={editor.pending}
        disabled={busy || editor.blocked || !privateQueries || !active || !available || editor.retryLeft > 0}
      >
        {editor.retryLeft > 0 ? `Повторить через ${editor.retryLeft} с` : "Сохранить категорию"}
      </Button>
    </form>
  );
}

export function BulkCategoryForm({
  companyId,
  accountId,
  payments,
  categories,
  recovery,
  onClose,
}: {
  companyId: string;
  accountId: string;
  payments: Payment[];
  categories: Category[];
  recovery: ReactNode;
  onClose: () => void;
}) {
  const id = useId();
  const client = useQueryClient();
  const { privateQueries } = usePrivateQueries();
  const [versions, setVersions] = useState(() =>
    payments.map((value) => ({ paymentId: value.id, expectedVersion: value.version })),
  );
  const [readReady, setReadReady] = useState(false);
  const identifiers = versions.map((value) => value.paymentId);
  const form = useForm<CategoryDraft>({
    resolver: zodResolver(categoryDraftSchema),
    defaultValues: { categoryCode: "" },
  });
  const chosen = useWatch({ control: form.control, name: "categoryCode" });
  const compatible = categories.filter((category) =>
    payments.every((value) => value.direction !== "UNKNOWN" && category.directions.includes(value.direction)),
  );
  const current = useQuery({
    queryKey: [...financialKeys.scope(companyId, accountId), "bulk-category-conflict", identifiers],
    enabled: false,
    retry: false,
    queryFn: ({ signal }) =>
      Promise.all(
        identifiers.map((paymentId) => paymentsApi.payment(companyId, accountId, paymentId, signal)),
      ),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: financialKeys.scope(companyId, accountId) });
  };
  const command = usePostCommand(
    (value: BulkCategoryDraft, key) => paymentsApi.bulk(companyId, accountId, value, key),
    () => {
      refresh();
      notify.success("Категории выбранных операций сохранены");
      onClose();
    },
  );
  usePermissionRefresh(command.issue);
  usePermissionRefresh(current.isError ? businessIssue(current.error) : null);
  const busy = useIsMutating() > 0;
  const needsVersions = command.issue?.kind === "version-conflict" || command.issue?.kind === "conflict";
  const disabled = busy || command.uncertain || needsVersions || !privateQueries;
  const confirming = useRef(false);
  const close = async () => {
    if (confirming.current) return;
    confirming.current = true;
    try {
      if (
        command.uncertain &&
        !(await confirmDialog({
          title: "Проверить результат в операциях?",
          description:
            "Ответ не получен. Категории уже могли измениться. Форма закроется, список перечитается перед новой командой.",
          confirmLabel: "Проверить операции",
          tone: "default",
        }))
      )
        return;
      if (command.uncertain) refresh();
      onClose();
    } finally {
      confirming.current = false;
    }
  };
  return (
    <Dialog
      open
      busy={busy}
      onOpenChange={(open) => {
        if (!open) void close();
      }}
      title="Категория выбранных операций"
      description={`Выбрано ${payments.length}. Применяется одна категория ко всем выбранным операциям текущей страницы.`}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || !privateQueries || command.retryLeft > 0 || (needsVersions && !command.uncertain))
            return;
          if (command.uncertain) {
            void command.repeat();
          } else if (compatible.some((value) => value.code === chosen))
            void form.handleSubmit((value) => {
              setReadReady(false);
              return command.send({ categoryCode: value.categoryCode, payments: versions });
            })(event);
        }}
      >
        <Controller
          name="categoryCode"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              htmlFor={`${id}-category`}
              label="Общая категория"
              error={fieldState.error?.message ?? command.issue?.fields?.categoryCode}
            >
              <Select
                id={`${id}-category`}
                ref={field.ref}
                name={field.name}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                disabled={disabled}
                options={compatible.map((value) => ({ value: value.code, label: value.name }))}
                invalid={Boolean(fieldState.error ?? command.issue?.fields?.categoryCode)}
                aria-describedby={
                  (fieldState.error ?? command.issue?.fields?.categoryCode)
                    ? `${id}-category-error`
                    : undefined
                }
              />
            </Field>
          )}
        />
        {compatible.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Нет общей доступной категории для выбранных типов операций. Измените выбор строк.
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          Изменение выполняется целиком. При конфликте ни одна выбранная категория не перезаписывается.
        </p>
        <Issue issue={command.issue} recovery={recovery} />
        {command.uncertain && (
          <p role="status" className="text-muted-foreground text-sm">
            Результат неизвестен. Повтор сохранит исходные операции, версии, категорию и ключ команды.
          </p>
        )}
        {needsVersions && !command.uncertain && (
          <div className="border-border bg-warning-soft text-warning-soft-foreground space-y-3 rounded-md border p-4 text-sm">
            <p>
              Выбранные операции изменились. Перечитайте их и подтвердите актуальные данные перед новой
              командой.
            </p>
            <Button
              size="sm"
              variant="secondary"
              loading={current.isFetching}
              disabled={busy || !privateQueries}
              onClick={() => {
                setReadReady(false);
                void current.refetch().then((result) => setReadReady(result.isSuccess));
              }}
            >
              Перечитать выбранные операции
            </Button>
            {current.isError && <Issue issue={businessIssue(current.error)} recovery={recovery} />}
            {readReady && current.data && !current.isFetching && !current.isError && (
              <>
                <ul className="space-y-3">
                  {current.data.map((value) => (
                    <li key={value.id} className="space-y-1 break-words">
                      <p>
                        {value.operationDate} · {value.counterpartyName ?? "Контрагент не указан"}
                      </p>
                      <Amount value={value.amount} animated={false} />
                      <p>Сейчас: {currentCategory(value, categories)}</p>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy || !privateQueries}
                  onClick={() => {
                    setVersions(
                      current.data.map((value) => ({
                        paymentId: value.id,
                        expectedVersion: value.version,
                      })),
                    );
                    command.clearKnownError();
                  }}
                >
                  Принять актуальные данные
                </Button>
              </>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            loading={command.pending}
            disabled={
              busy ||
              !privateQueries ||
              command.retryLeft > 0 ||
              (!command.uncertain && (needsVersions || !compatible.some((value) => value.code === chosen)))
            }
            onClick={(event) => {
              if (event.detail > 1) event.preventDefault();
            }}
          >
            {command.retryLeft > 0
              ? `Повторить через ${command.retryLeft} с`
              : command.uncertain
                ? "Повторить ту же команду"
                : "Применить категорию"}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void close()}>
            {command.uncertain ? "Проверить операции" : "Отмена"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

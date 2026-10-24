import { useId, useRef, useState, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Amount,
  Button,
  DatePicker,
  Dialog,
  Field,
  MoneyInput,
  Textarea,
  confirmDialog,
  notify,
} from "@zapas/ui";
import { usePrivateQueries } from "@/entities/auth-profile";
import {
  balanceAnchorSchema,
  workspaceApi,
  workspaceManagement,
  workspaceKeys,
  type Company,
  type Account,
  type BalanceAnchorDraft,
} from "@/entities/workspace";
import { businessIssue, type BusinessIssue } from "@/shared/api/problem.ts";
import { usePostCommand } from "@/shared/api/usePostCommand.ts";
import { usePermissionRefresh } from "../model/usePermissionRefresh.ts";

function useClose(uncertain: boolean, onClose: () => void, refresh: () => void) {
  const confirming = useRef(false);
  return async () => {
    if (confirming.current) return;
    confirming.current = true;
    try {
      if (
        uncertain &&
        !(await confirmDialog({
          title: "Проверить результат?",
          description:
            "Ответ не получен. Изменение уже могло сохраниться. Закройте форму и перечитайте данные перед новой командой.",
          confirmLabel: "Проверить данные",
          tone: "default",
        }))
      )
        return;
      if (uncertain) refresh();
      onClose();
    } finally {
      confirming.current = false;
    }
  };
}
function CommandIssue({
  issue,
  uncertain,
  recovery,
}: {
  issue: BusinessIssue | null;
  uncertain: boolean;
  recovery: ReactNode;
}) {
  if (!issue) return null;
  return (
    <div
      role="alert"
      className="border-border bg-warning-soft text-warning-soft-foreground space-y-2 rounded-md border p-4 text-sm"
    >
      <p>{issue.message}</p>
      {uncertain && <p>Результат неизвестен. Повтор сохранит исходные данные и ключ команды.</p>}
      {["refresh-uncertain", "unauthorized"].includes(issue.kind) && recovery}
    </div>
  );
}

export function ArchiveForm({
  company,
  account,
  onClose,
  recovery,
}: {
  company: Company;
  account?: Account;
  onClose: () => void;
  recovery: ReactNode;
}) {
  const client = useQueryClient();
  const { privateQueries } = usePrivateQueries();
  const [version, setVersion] = useState(account?.version ?? company.version);
  const accountId = account?.id ?? null;
  const companyId = company.id;
  const fresh = useQuery<Company | Account>({
    queryKey: ["workspace", "archive-check", companyId, accountId],
    enabled: false,
    retry: false,
    queryFn: async ({ signal }) =>
      accountId
        ? workspaceApi.account(companyId, accountId, signal)
        : workspaceApi.company(companyId, signal),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["workspace"] });
  };
  const command = usePostCommand(
    async (value: { version: number }, key) => {
      return account
        ? await workspaceManagement.archiveAccount(company.id, account.id, value.version, key)
        : await workspaceManagement.archiveCompany(company.id, value.version, key);
    },
    (value) => {
      if ("companyId" in value) client.setQueryData(workspaceKeys.account(company.id, value.id), value);
      else client.setQueryData(workspaceKeys.company(company.id), value);
      refresh();
      notify.success(account ? "Счёт перемещён в архив" : "Организация перемещена в архив");
      onClose();
    },
  );
  const needsVersion = command.issue?.kind === "version-conflict";
  usePermissionRefresh(command.issue);
  const busy = useIsMutating() > 0;
  const close = useClose(command.uncertain, onClose, refresh);
  return (
    <Dialog
      open
      busy={busy}
      onOpenChange={(open) => {
        if (!open) void close();
      }}
      title={account ? "Архивировать счёт?" : "Архивировать организацию?"}
      description={account?.name ?? company.name}
    >
      <div className="space-y-4">
        <p className="text-sm">
          История останется доступна для чтения. Новые записи и расчёты будут запрещены. Восстановление через
          кабинет пока недоступно.
        </p>
        <CommandIssue issue={command.issue} uncertain={command.uncertain} recovery={recovery} />
        {needsVersion && !command.uncertain && (
          <div className="border-border space-y-3 rounded-md border p-4 text-sm">
            <p>Ресурс изменился. Перечитайте его перед новой командой.</p>
            <Button
              variant="secondary"
              size="sm"
              loading={fresh.isFetching}
              disabled={busy || !privateQueries}
              onClick={() => void fresh.refetch()}
            >
              Перечитать перед архивированием
            </Button>
            {fresh.isError && (
              <CommandIssue issue={businessIssue(fresh.error)} uncertain={false} recovery={recovery} />
            )}
            {fresh.data && !fresh.isFetching && !fresh.isError && (
              <>
                <p className="break-words">
                  Актуальное название: {fresh.data.name}.{" "}
                  {fresh.data.archived ? "Уже в архиве." : "Не в архиве."}
                </p>
                {!fresh.data.archived &&
                  ("role" in fresh.data ? fresh.data.role === "OWNER" : company.role === "OWNER") && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setVersion(fresh.data.version);
                        command.clearKnownError();
                      }}
                    >
                      Использовать актуальную версию
                    </Button>
                  )}
              </>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            loading={command.pending}
            disabled={
              busy || !privateQueries || command.retryLeft > 0 || (needsVersion && !command.uncertain)
            }
            onClick={(event) => {
              if (event.detail <= 1) void (command.uncertain ? command.repeat() : command.send({ version }));
            }}
          >
            {command.retryLeft > 0
              ? `Повторить через ${command.retryLeft} с`
              : command.uncertain
                ? "Повторить отправку"
                : "Архивировать"}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void close()}>
            {command.uncertain ? "Проверить данные" : "Отмена"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function moscowToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function BalanceForm({
  company,
  account,
  onClose,
  recovery,
}: {
  company: Company;
  account: Account;
  onClose: () => void;
  recovery: ReactNode;
}) {
  const id = useId();
  const client = useQueryClient();
  const { privateQueries } = usePrivateQueries();
  const today = moscowToday();
  const form = useForm<BalanceAnchorDraft>({
    resolver: zodResolver(
      balanceAnchorSchema.refine((value) => value.date <= today, {
        path: ["date"],
        message: "Будущая дата остатка недопустима",
      }),
    ),
    defaultValues: { date: "", balance: "", reason: "" },
  });
  const [saved, setSaved] = useState<Awaited<ReturnType<typeof workspaceManagement.anchor>> | null>(null);
  const refresh = () => {
    void client.invalidateQueries({ queryKey: workspaceKeys.account(company.id, account.id) });
    void client.invalidateQueries({ queryKey: workspaceKeys.accounts(company.id) });
  };
  const command = usePostCommand(
    (value: BalanceAnchorDraft, key) => workspaceManagement.anchor(company.id, account.id, value, key),
    (value) => {
      // An older anchor need not be the latest balance. Always reread the account.
      refresh();
      setSaved(value);
      notify.success("Подтверждённый остаток сохранён");
    },
  );
  usePermissionRefresh(command.issue);
  const busy = useIsMutating() > 0;
  const disabled = busy || command.uncertain || !privateQueries;
  const close = useClose(command.uncertain, onClose, refresh);
  const error = (key: keyof BalanceAnchorDraft) =>
    form.formState.errors[key]?.message ?? command.issue?.fields?.[key];
  return (
    <Dialog
      open
      busy={busy}
      onOpenChange={(open) => {
        if (!open) void close();
      }}
      title="Подтверждённый остаток"
      description={`${account.name} · ${company.name} · RUB`}
    >
      {saved ? (
        <div className="space-y-4">
          <p role="status">Сохранён ручной остаток на {saved.date}.</p>
          <Amount
            value={saved.balance}
            kopecks
            animated={false}
            className="text-xl font-semibold break-all"
          />
          <p className="text-muted-foreground text-sm break-words">
            Основание: {saved.reason ?? "Не указано"}
          </p>
          <p className="text-sm">
            Выписка не изменена. Последний известный остаток счёта обновляется с сервера.
          </p>
          <Button onClick={onClose}>Готово</Button>
        </div>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            if (command.uncertain) {
              event.preventDefault();
              void command.repeat();
            } else void form.handleSubmit(command.send)(event);
          }}
        >
          <p className="text-muted-foreground text-sm">
            Укажите известный остаток и его основание. Нулевой и отрицательный остаток допустимы. Выписка не
            переписывается.
          </p>
          <Controller
            name="date"
            control={form.control}
            render={({ field }) => (
              <Field htmlFor={`${id}-date`} label="Дата остатка" error={error("date")}>
                <DatePicker
                  id={`${id}-date`}
                  ref={field.ref}
                  value={field.value || undefined}
                  onValueChange={(value) => field.onChange(value ?? "")}
                  onBlur={field.onBlur}
                  disabled={disabled}
                  invalid={Boolean(error("date"))}
                  aria-describedby={error("date") ? `${id}-date-error` : undefined}
                />
              </Field>
            )}
          />
          <Controller
            name="balance"
            control={form.control}
            render={({ field }) => (
              <Field htmlFor={`${id}-balance`} label="Остаток, ₽" error={error("balance")}>
                <MoneyInput
                  id={`${id}-balance`}
                  ref={field.ref}
                  name={field.name}
                  value={field.value || null}
                  onChange={(value) => field.onChange(value ?? "")}
                  onBlur={field.onBlur}
                  allowNegative
                  disabled={disabled}
                  invalid={Boolean(error("balance"))}
                  aria-describedby={error("balance") ? `${id}-balance-error` : undefined}
                />
              </Field>
            )}
          />
          <Field
            htmlFor={`${id}-reason`}
            label="Основание"
            hint="Например, сверка остатка с банком. До 500 символов."
            error={error("reason")}
          >
            <Textarea
              id={`${id}-reason`}
              {...form.register("reason")}
              disabled={disabled}
              invalid={Boolean(error("reason"))}
              aria-describedby={error("reason") ? `${id}-reason-error` : undefined}
            />
          </Field>
          <CommandIssue issue={command.issue} uncertain={command.uncertain} recovery={recovery} />
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              loading={command.pending}
              disabled={busy || !privateQueries || command.retryLeft > 0}
              onClick={(event) => {
                if (event.detail > 1) event.preventDefault();
              }}
            >
              {command.retryLeft > 0
                ? `Повторить через ${command.retryLeft} с`
                : command.uncertain
                  ? "Повторить отправку"
                  : "Сохранить остаток"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void close()}>
              {command.uncertain ? "Проверить данные" : "Отмена"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

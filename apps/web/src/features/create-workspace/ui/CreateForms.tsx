import { useId, useRef, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, Field, Input, Select, confirmDialog, notify } from "@zapas/ui";
import {
  accountDraftSchema,
  companyDraftSchema,
  workspaceApi,
  workspaceKeys,
  type Account,
  type AccountDraft,
  type Company,
  type CompanyDraft,
} from "@/entities/workspace";
import { usePostCommand } from "@/shared/api/usePostCommand.ts";
import type { BusinessIssue } from "@/shared/api/problem.ts";

function useCreationClose(uncertain: boolean, onClose: () => void, refresh: () => void) {
  const confirming = useRef(false);
  return async () => {
    if (confirming.current) return;
    confirming.current = true;
    try {
      if (
        uncertain &&
        !(await confirmDialog({
          title: "Проверить результат в списке?",
          description:
            "Ответ не получен, объект уже мог быть создан. Форма закроется. Проверьте список перед новым созданием.",
          confirmLabel: "Проверить список",
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

function CommandMessage({
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
      className="border-border bg-warning-soft text-warning-soft-foreground rounded-md border p-4 text-sm"
    >
      <p>{issue.message}</p>
      {uncertain && (
        <p className="mt-2">Результат создания неизвестен. Повторите отправку с прежними данными.</p>
      )}
      {(issue.kind === "refresh-uncertain" || issue.kind === "unauthorized") && recovery}
    </div>
  );
}

export function CreateCompanyForm({
  onCreated,
  onClose,
  recovery,
}: {
  onCreated: (value: Company) => void;
  onClose: () => void;
  recovery: ReactNode;
}) {
  const id = useId();
  const client = useQueryClient();
  const form = useForm<CompanyDraft>({
    resolver: zodResolver(companyDraftSchema),
    defaultValues: { name: "", legalForm: "OOO", inn: "", kpp: "" },
  });
  const command = usePostCommand(workspaceApi.createCompany, (company) => {
    client.setQueryData(workspaceKeys.company(company.id), company);
    void client.invalidateQueries({ queryKey: workspaceKeys.companies });
    notify.success("Организация создана");
    onCreated(company);
  });
  const busy = useIsMutating() > 0;
  const disabled = busy || command.uncertain;
  const close = useCreationClose(command.uncertain, onClose, () => {
    void client.invalidateQueries({ queryKey: workspaceKeys.companies });
  });
  const fieldError = (field: keyof CompanyDraft) =>
    form.formState.errors[field]?.message ?? command.issue?.fields?.[field];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void close();
      }}
      busy={busy}
      title="Создать организацию"
      description="Реквизиты принадлежат организации. Профиль человека настраивается отдельно."
    >
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
        <Field htmlFor={`${id}-name`} label="Название организации" error={fieldError("name")}>
          <Input
            id={`${id}-name`}
            {...form.register("name")}
            disabled={disabled}
            invalid={Boolean(fieldError("name"))}
            aria-describedby={fieldError("name") ? `${id}-name-error` : undefined}
            autoComplete="organization"
          />
        </Field>
        <Controller
          name="legalForm"
          control={form.control}
          render={({ field }) => (
            <Field htmlFor={`${id}-form`} label="Правовая форма" error={fieldError("legalForm")}>
              <Select
                id={`${id}-form`}
                ref={field.ref}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
                disabled={disabled}
                invalid={Boolean(fieldError("legalForm"))}
                aria-describedby={fieldError("legalForm") ? `${id}-form-error` : undefined}
                options={[
                  { value: "OOO", label: "ООО" },
                  { value: "IP", label: "ИП" },
                  { value: "OTHER", label: "Другая" },
                ]}
              />
            </Field>
          )}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["inn", "ИНН", "10 или 12 цифр, необязательно"],
              ["kpp", "КПП", "9 цифр, необязательно"],
            ] as const
          ).map(([name, label, hint]) => (
            <Field key={name} htmlFor={`${id}-${name}`} label={label} hint={hint} error={fieldError(name)}>
              <Input
                id={`${id}-${name}`}
                {...form.register(name)}
                inputMode="numeric"
                disabled={disabled}
                invalid={Boolean(fieldError(name))}
                aria-describedby={fieldError(name) ? `${id}-${name}-error` : undefined}
              />
            </Field>
          ))}
        </div>
        <p className="text-muted-foreground text-sm">
          Часовой пояс: Москва. Счета ведутся отдельно в рублях.
        </p>
        <CommandMessage issue={command.issue} uncertain={command.uncertain} recovery={recovery} />
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            onClick={(event) => {
              if (event.detail > 1) event.preventDefault();
            }}
            loading={command.pending}
            disabled={busy || command.retryLeft > 0}
          >
            {command.retryLeft > 0
              ? `Повторить через ${command.retryLeft} с`
              : command.uncertain
                ? "Повторить отправку"
                : "Создать организацию"}
          </Button>
          <Button variant="secondary" onClick={() => void close()} disabled={busy}>
            {command.uncertain ? "Вернуться к списку" : "Отмена"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function CreateAccountForm({
  company,
  onCreated,
  onClose,
  recovery,
}: {
  company: Company;
  onCreated: (value: Account) => void;
  onClose: () => void;
  recovery: ReactNode;
}) {
  const id = useId();
  const client = useQueryClient();
  const form = useForm<AccountDraft>({
    resolver: zodResolver(accountDraftSchema),
    defaultValues: { name: "", bankName: "", accountNumber: "", externalCompanyId: "" },
  });
  const command = usePostCommand(
    (value: AccountDraft, key: string) => workspaceApi.createAccount(company.id, value, key),
    (account) => {
      client.setQueryData(workspaceKeys.account(company.id, account.id), account);
      void client.invalidateQueries({ queryKey: workspaceKeys.accounts(company.id) });
      notify.success("Счёт добавлен");
      onCreated(account);
    },
  );
  const busy = useIsMutating() > 0;
  const disabled = busy || command.uncertain;
  const close = useCreationClose(command.uncertain, onClose, () => {
    void client.invalidateQueries({ queryKey: workspaceKeys.accounts(company.id) });
  });
  const fieldError = (field: keyof AccountDraft) =>
    form.formState.errors[field]?.message ?? command.issue?.fields?.[field];
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) void close();
      }}
      busy={busy}
      title="Добавить счёт"
      description={`Организация: ${company.name}. Прогноз рассчитывается для одного выбранного RUB-счёта.`}
    >
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
        {(
          [
            ["name", "Название счёта"],
            ["bankName", "Банк"],
            ["accountNumber", "Номер счёта"],
            ["externalCompanyId", "ID компании в выписке"],
          ] as const
        ).map(([name, label]) => (
          <Field
            key={name}
            htmlFor={`${id}-${name}`}
            label={label}
            error={fieldError(name)}
            hint={
              name === "name"
                ? undefined
                : name === "externalCompanyId"
                  ? "Необязательно. Для сопоставления данных выписки с компанией."
                  : "Необязательно"
            }
          >
            <Input
              id={`${id}-${name}`}
              {...form.register(name)}
              disabled={disabled}
              inputMode={name === "accountNumber" ? "numeric" : "text"}
              invalid={Boolean(fieldError(name))}
              aria-describedby={fieldError(name) ? `${id}-${name}-error` : undefined}
            />
          </Field>
        ))}
        <p className="text-muted-foreground text-sm">
          Создание счёта не задаёт остаток и не добавляет операции.
        </p>
        <CommandMessage issue={command.issue} uncertain={command.uncertain} recovery={recovery} />
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            onClick={(event) => {
              if (event.detail > 1) event.preventDefault();
            }}
            loading={command.pending}
            disabled={busy || command.retryLeft > 0}
          >
            {command.retryLeft > 0
              ? `Повторить через ${command.retryLeft} с`
              : command.uncertain
                ? "Повторить отправку"
                : "Добавить счёт"}
          </Button>
          <Button variant="secondary" onClick={() => void close()} disabled={busy}>
            {command.uncertain ? "Вернуться к списку" : "Отмена"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

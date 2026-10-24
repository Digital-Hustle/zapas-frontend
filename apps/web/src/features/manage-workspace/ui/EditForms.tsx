import { useId, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, Field, Input, Select } from "@zapas/ui";
import { usePrivateQueries } from "@/entities/auth-profile";
import {
  companyDraftSchema,
  accountDraftSchema,
  workspaceApi,
  workspaceManagement,
  workspaceKeys,
  canWriteAccounts,
  type Company,
  type Account,
  type CompanyDraft,
  type AccountDraft,
} from "@/entities/workspace";
import type { BusinessIssue } from "@/shared/api/problem.ts";
import { businessIssue } from "@/shared/api/problem.ts";
import { useVersionedEdit } from "@/shared/api/useVersionedEdit.ts";
import { usePermissionRefresh } from "../model/usePermissionRefresh.ts";

function companyDraft(company: Company): Partial<CompanyDraft> {
  return {
    name: company.name,
    legalForm: company.legalForm === "UNKNOWN" ? undefined : company.legalForm,
    inn: company.inn ?? "",
    kpp: company.kpp ?? "",
  };
}
function accountDraft(account: Account): AccountDraft {
  return {
    name: account.name,
    bankName: account.bankName ?? "",
    accountNumber: account.accountNumber ?? "",
    externalCompanyId: account.externalCompanyId ?? "",
  };
}
function Issue({ issue, recovery }: { issue: BusinessIssue | null; recovery: ReactNode }) {
  if (!issue) return null;
  return (
    <div role="alert" className="text-danger text-sm">
      <p>{issue.message}</p>
      {["refresh-uncertain", "unauthorized"].includes(issue.kind) && recovery}
    </div>
  );
}

function Conflict({
  pending,
  error,
  content,
  onReload,
  onChoose,
  allowed,
  recovery,
}: {
  pending: boolean;
  error: unknown;
  content: ReactNode;
  onReload: () => void;
  onChoose: (keep: boolean) => void;
  allowed: boolean;
  recovery: ReactNode;
}) {
  return (
    <div className="border-border bg-warning-soft text-warning-soft-foreground space-y-3 rounded-md border p-4 text-sm">
      <p role="alert">Данные изменились или результат сохранения неизвестен. Ваш вариант остался в форме.</p>
      {pending ? (
        <p role="status">Читаем актуальные данные…</p>
      ) : error ? (
        <Issue issue={businessIssue(error)} recovery={recovery} />
      ) : (
        content
      )}
      <Button variant="secondary" size="sm" onClick={onReload} disabled={pending}>
        Перечитать данные
      </Button>
      {allowed && !pending && !error && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onChoose(true)}>
            Оставить мой вариант
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onChoose(false)}>
            Загрузить актуальные данные
          </Button>
        </div>
      )}
      {!allowed && !pending && !error && (
        <p>Запись сейчас недоступна. Закройте форму и обновите организацию.</p>
      )}
    </div>
  );
}

export function EditCompanyForm({
  company,
  onClose,
  recovery,
}: {
  company: Company;
  onClose: () => void;
  recovery: ReactNode;
}) {
  const id = useId();
  const client = useQueryClient();
  const { privateQueries } = usePrivateQueries();
  const form = useForm<CompanyDraft>({
    resolver: zodResolver(companyDraftSchema),
    defaultValues: companyDraft(company),
  });
  const editor = useVersionedEdit({
    resource: company,
    queryKey: ["workspace", "edit-company", company.id],
    active: privateQueries,
    read: (signal) => workspaceApi.company(company.id, signal),
    write: (value: CompanyDraft, version) => workspaceManagement.updateCompany(company.id, value, version),
    onSaved: (value) => {
      client.setQueryData(workspaceKeys.company(company.id), value);
      void client.invalidateQueries({ queryKey: workspaceKeys.companies });
      onClose();
    },
  });
  usePermissionRefresh(editor.issue);
  const busy = useIsMutating() > 0;
  const disabled = busy || editor.blocked || !privateQueries;
  const error = (key: keyof CompanyDraft) =>
    form.formState.errors[key]?.message ?? editor.issue?.fields?.[key];
  const fresh = editor.current.data;
  const allowed = Boolean(
    fresh && !fresh.archived && fresh.role === "OWNER" && fresh.permissions.canEditCompany,
  );
  return (
    <Dialog
      open
      busy={busy}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Реквизиты организации"
      description="Полное сохранение реквизитов с проверкой версии."
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void form.handleSubmit(editor.submit)(event);
        }}
      >
        <Field htmlFor={`${id}-name`} label="Название организации" error={error("name")}>
          <Input
            id={`${id}-name`}
            {...form.register("name")}
            disabled={disabled}
            invalid={Boolean(error("name"))}
            aria-describedby={error("name") ? `${id}-name-error` : undefined}
          />
        </Field>
        <Controller
          name="legalForm"
          control={form.control}
          render={({ field }) => (
            <Field htmlFor={`${id}-form`} label="Правовая форма" error={error("legalForm")}>
              <Select
                id={`${id}-form`}
                {...field}
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
                invalid={Boolean(error("legalForm"))}
                aria-describedby={error("legalForm") ? `${id}-form-error` : undefined}
                options={[
                  { value: "OOO", label: "ООО" },
                  { value: "IP", label: "ИП" },
                  { value: "OTHER", label: "Другая" },
                ]}
              />
            </Field>
          )}
        />
        {(
          [
            ["inn", "ИНН"],
            ["kpp", "КПП"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} htmlFor={`${id}-${key}`} label={label} error={error(key)} hint="Необязательно">
            <Input
              id={`${id}-${key}`}
              {...form.register(key)}
              inputMode="numeric"
              disabled={disabled}
              invalid={Boolean(error(key))}
              aria-describedby={error(key) ? `${id}-${key}-error` : undefined}
            />
          </Field>
        ))}
        <Issue issue={editor.issue} recovery={recovery} />
        {editor.blocked && (
          <Conflict
            pending={editor.current.isFetching}
            error={editor.current.error}
            recovery={recovery}
            allowed={allowed}
            onReload={() => {
              if (privateQueries) void editor.current.refetch();
            }}
            onChoose={(keep) => {
              const value = editor.choose();
              if (value && !keep) form.reset(companyDraft(value));
            }}
            content={
              fresh && (
                <div className="space-y-2 break-words">
                  <p>Актуальные реквизиты:</p>
                  <p>
                    {fresh.name} · {fresh.legalForm}
                  </p>
                  <p>ИНН: {fresh.inn ?? "Не указан"}</p>
                  <p>КПП: {fresh.kpp ?? "Не указан"}</p>
                  <p>Часовой пояс: Москва</p>
                </div>
              )
            }
          />
        )}
        {editor.message && (
          <p role="status" className="text-muted-foreground text-sm">
            {editor.message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={editor.pending} disabled={disabled || editor.retryLeft > 0}>
            {editor.retryLeft > 0 ? `Повторить через ${editor.retryLeft} с` : "Сохранить изменения"}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function EditAccountForm({
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
  const form = useForm<AccountDraft>({
    resolver: zodResolver(accountDraftSchema),
    defaultValues: accountDraft(account),
  });
  const editor = useVersionedEdit({
    resource: account,
    queryKey: ["workspace", "edit-account", company.id, account.id],
    active: privateQueries,
    read: (signal) => workspaceApi.account(company.id, account.id, signal),
    write: (value: AccountDraft, version) =>
      workspaceManagement.updateAccount(company.id, account.id, value, version),
    onSaved: (value) => {
      client.setQueryData(workspaceKeys.account(company.id, account.id), value);
      void client.invalidateQueries({ queryKey: workspaceKeys.accounts(company.id) });
      onClose();
    },
  });
  usePermissionRefresh(editor.issue);
  const busy = useIsMutating() > 0;
  const disabled = busy || editor.blocked || !privateQueries;
  const error = (key: keyof AccountDraft) =>
    form.formState.errors[key]?.message ?? editor.issue?.fields?.[key];
  const fresh = editor.current.data;
  return (
    <Dialog
      open
      busy={busy}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Реквизиты счёта"
      description={`Организация: ${company.name}. Валюта: RUB.`}
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          void form.handleSubmit(editor.submit)(event);
        }}
      >
        {(
          [
            ["name", "Название счёта"],
            ["bankName", "Банк"],
            ["accountNumber", "Номер счёта"],
            ["externalCompanyId", "ID компании в выписке"],
          ] as const
        ).map(([key, label]) => (
          <Field
            key={key}
            htmlFor={`${id}-${key}`}
            label={label}
            error={error(key)}
            hint={key === "name" ? undefined : "Необязательно"}
          >
            <Input
              id={`${id}-${key}`}
              {...form.register(key)}
              inputMode={key === "accountNumber" ? "numeric" : "text"}
              disabled={disabled}
              invalid={Boolean(error(key))}
              aria-describedby={error(key) ? `${id}-${key}-error` : undefined}
            />
          </Field>
        ))}
        <Issue issue={editor.issue} recovery={recovery} />
        {editor.blocked && (
          <Conflict
            pending={editor.current.isFetching}
            error={editor.current.error}
            recovery={recovery}
            allowed={Boolean(fresh && !fresh.archived && canWriteAccounts(company))}
            onReload={() => {
              if (privateQueries) void editor.current.refetch();
            }}
            onChoose={(keep) => {
              const value = editor.choose();
              if (value && !keep) form.reset(accountDraft(value));
            }}
            content={
              fresh && (
                <div className="space-y-2 break-all">
                  <p>Актуальные реквизиты:</p>
                  <p>{fresh.name}</p>
                  <p>Банк: {fresh.bankName ?? "Не указан"}</p>
                  <p>Номер: {fresh.accountNumber ?? "Не указан"}</p>
                  <p>ID в выписке: {fresh.externalCompanyId ?? "Не указан"}</p>
                </div>
              )
            }
          />
        )}
        {editor.message && (
          <p role="status" className="text-muted-foreground text-sm">
            {editor.message}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={editor.pending} disabled={disabled || editor.retryLeft > 0}>
            {editor.retryLeft > 0 ? `Повторить через ${editor.retryLeft} с` : "Сохранить изменения"}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            Отмена
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

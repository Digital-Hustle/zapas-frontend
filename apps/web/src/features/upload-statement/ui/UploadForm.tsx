import { useEffect, useId, type ReactNode } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useBlocker } from "react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating, useQueryClient } from "@tanstack/react-query";
import { Button, Checkbox, DateRangePicker, Dialog, Field, FileDrop, RadioGroup, notify } from "@zapas/ui";
import { usePrivateQueries } from "@/entities/auth-profile";
import { type Company, type Account, workspaceKeys } from "@/entities/workspace";
import {
  ImportProblem,
  importsApi,
  importDraftSchema,
  maxStatementSize,
  importKeys,
  type ImportDraft,
  type ImportFormDraft,
  type StatementImport,
} from "@/entities/imports";
import { usePostCommand } from "@/shared/api/usePostCommand.ts";

export function UploadForm({
  company,
  account,
  onImported,
  onReport,
  recovery,
}: {
  company: Company;
  account: Account;
  onImported: (value: StatementImport) => void;
  onReport: (id: string) => void;
  recovery: ReactNode;
}) {
  const id = useId();
  const client = useQueryClient();
  const { privateQueries } = usePrivateQueries();
  const form = useForm<ImportFormDraft, unknown, ImportDraft>({
    resolver: zodResolver(importDraftSchema),
    defaultValues: {
      file: null,
      validationMode: "ATOMIC",
      completeness: "UNKNOWN",
      fromDate: "",
      toDate: "",
    },
  });
  const complete = useWatch({ control: form.control, name: "completeness" }) === "CONFIRMED_COMPLETE";
  const toDate = useWatch({ control: form.control, name: "toDate" });
  const mode = useWatch({ control: form.control, name: "validationMode" });
  const command = usePostCommand(
    (value: ImportDraft, key) => importsApi.upload(company.id, account.id, value, key),
    (value) => {
      client.setQueryData(importKeys.report(company.id, account.id, value.id), value);
      void client.invalidateQueries({ queryKey: importKeys.scope(company.id, account.id) });
      void client.invalidateQueries({ queryKey: workspaceKeys.account(company.id, account.id) });
      void client.invalidateQueries({ queryKey: workspaceKeys.accounts(company.id) });
      if (value.status === "COMMITTED") notify.success("Импорт завершён. Проверьте итог и предупреждения.");
      else notify.warning("Импорт ещё не подтверждён. Проверьте его статус и отчёт.");
      form.reset({ file: null, validationMode: "ATOMIC", completeness: "UNKNOWN", fromDate: "", toDate: "" });
      onImported(value);
    },
  );
  useEffect(() => {
    if (command.error instanceof ImportProblem && command.error.reportId) onReport(command.error.reportId);
  }, [command.error, onReport]);
  useEffect(() => {
    if (command.issue?.kind === "forbidden" || command.issue?.kind === "not-found")
      void client.invalidateQueries({ queryKey: ["workspace"] });
  }, [client, command.issue?.kind]);
  const busy = useIsMutating() > 0;
  const disabled = busy || command.uncertain || !privateQueries;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (command.pending || command.uncertain) &&
      (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search),
  );
  const fileError = form.formState.errors.file?.message ?? command.issue?.fields?.file;
  const rangeError = form.formState.errors.fromDate?.message ?? form.formState.errors.toDate?.message;
  return (
    <section aria-labelledby={`${id}-title`} className="border-border bg-card rounded-lg border p-5 sm:p-6">
      <h2 id={`${id}-title`} className="text-xl font-semibold">
        Загрузить выписку CSV
      </h2>
      <p className="text-muted-foreground mt-2 text-sm break-words">
        {company.name} · {account.name}. До 20 МиБ и 50 000 строк. Проверка содержимого выполняется сервером.
      </p>
      <form
        noValidate
        className="mt-5 flex flex-col gap-5"
        onSubmit={(event) => {
          if (command.uncertain) {
            event.preventDefault();
            void command.repeat();
          } else void form.handleSubmit(command.send)(event);
        }}
      >
        <Controller
          name="file"
          control={form.control}
          render={({ field }) => (
            <FileDrop
              id={`${id}-file`}
              label="Выбрать выписку CSV"
              description="Один CSV, до 20 МиБ. Выберите файл для этого счёта."
              value={field.value ?? null}
              onValueChange={field.onChange}
              maxSize={maxStatementSize}
              disabled={disabled}
              busy={command.pending}
              error={fileError}
            />
          )}
        />
        <Controller
          name="validationMode"
          control={form.control}
          render={({ field }) => (
            <RadioGroup
              ref={field.ref}
              name={field.name}
              label="Обработка ошибок строк"
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
              options={[
                { value: "ATOMIC", label: "Отклонить весь файл при ошибке" },
                { value: "SKIP_INVALID", label: "Сохранить корректные строки, пропустить ошибочные" },
              ]}
            />
          )}
        />
        <p className="text-muted-foreground text-sm">
          {mode === "SKIP_INVALID"
            ? "Ошибочные строки не попадут в операции. Их количество и причины останутся в отчёте. Пропуск строк сам по себе не подтверждает полный период."
            : "При ошибке строки ни одна операция из файла не будет сохранена."}
        </p>
        <Controller
          name="completeness"
          control={form.control}
          render={({ field }) => (
            <div className="flex items-start gap-3">
              <Checkbox
                id={`${id}-complete`}
                ref={field.ref}
                checked={field.value === "CONFIRMED_COMPLETE"}
                onCheckedChange={(checked) =>
                  field.onChange(checked === true ? "CONFIRMED_COMPLETE" : "UNKNOWN")
                }
                onBlur={field.onBlur}
                disabled={disabled}
                aria-describedby={`${id}-completeness-help`}
              />
              <label htmlFor={`${id}-complete`} className="pt-2 text-sm">
                Подтверждаю: выписка содержит все операции за выбранный период
              </label>
            </div>
          )}
        />
        <p id={`${id}-completeness-help`} className="text-muted-foreground text-sm">
          {complete
            ? "Подтверждение влияет на прогноз: отсутствие операций внутри полного периода означает подтверждённый нулевой поток."
            : "Полнота неизвестна. Дни без строк не считаются днями без операций и не заменяются нулями."}
        </p>
        {complete && (
          <Controller
            name="fromDate"
            control={form.control}
            render={({ field }) => (
              <Field htmlFor={`${id}-range`} label="Полный период выписки" error={rangeError}>
                <DateRangePicker
                  id={`${id}-range`}
                  ref={field.ref}
                  value={field.value && toDate ? { from: field.value, to: toDate } : undefined}
                  onValueChange={(value) => {
                    field.onChange(value?.from ?? "");
                    form.setValue("toDate", value?.to ?? "", { shouldValidate: true });
                  }}
                  onBlur={field.onBlur}
                  disabled={disabled}
                  invalid={Boolean(rangeError)}
                  aria-describedby={rangeError ? `${id}-range-error` : undefined}
                />
              </Field>
            )}
          />
        )}
        {command.pending && (
          <p role="status" className="text-muted-foreground text-sm">
            Файл обрабатывается. Операция может занять до двух минут. Не отправляйте новую загрузку.
          </p>
        )}
        {command.issue && (
          <div
            role="alert"
            className="border-border bg-warning-soft text-warning-soft-foreground space-y-2 rounded-md border p-4 text-sm"
          >
            <p>{command.issue.message}</p>
            {command.uncertain && (
              <p>
                Ответ не получен. Результат неизвестен. Повтор отправит тот же файл с теми же параметрами и
                ключом.
              </p>
            )}
            {["refresh-uncertain", "unauthorized"].includes(command.issue.kind) && recovery}
          </div>
        )}
        <Button
          type="submit"
          className="w-fit"
          loading={command.pending}
          disabled={busy || !privateQueries || command.retryLeft > 0}
          onClick={(event) => {
            if (event.detail > 1) event.preventDefault();
          }}
        >
          {command.retryLeft > 0
            ? `Повторить через ${command.retryLeft} с`
            : command.uncertain
              ? "Повторить ту же загрузку"
              : "Загрузить выписку"}
        </Button>
      </form>
      <Dialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.state === "blocked") blocker.reset();
        }}
        title="Покинуть импорт?"
        description="Файл уже мог быть принят сервером. Перед новой загрузкой проверьте историю импорта."
      >
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              if (blocker.state === "blocked") blocker.reset();
            }}
          >
            Остаться
          </Button>
          <Button
            onClick={() => {
              if (blocker.state === "blocked") {
                void client.invalidateQueries({ queryKey: importKeys.scope(company.id, account.id) });
                blocker.proceed();
              }
            }}
          >
            Перейти и проверить историю
          </Button>
        </div>
      </Dialog>
    </section>
  );
}

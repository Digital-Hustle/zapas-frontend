import { useEffect, type ReactNode } from "react";
import {
  useForm,
  type FieldValues,
  type UseFormReturn,
  type DefaultValues,
  type FieldPath,
} from "react-hook-form";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { z } from "zod";
import { Button, notify } from "@zapas/ui";
import { usePendingCommand } from "@/shared/lib/pending-commands.ts";
import { usePostCommand } from "@/shared/api/usePostCommand.ts";
import { useVersionedEdit } from "@/shared/api/useVersionedEdit.ts";
import { businessIssue, type BusinessIssue } from "@/shared/api/problem.ts";

function useFields<T extends FieldValues>(schema: z.ZodType<T>, defaults: T) {
  const form = useForm<T>({ defaultValues: defaults as DefaultValues<T> });
  const validate = (value: T, action: (value: T) => Promise<unknown>) => {
    form.clearErrors();
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        form.setError(issue.path.join(".") as FieldPath<T>, { message: issue.message });
      return;
    }
    return action(parsed.data);
  };
  return { form, validate };
}
function useServerFields<T extends FieldValues>(issue: BusinessIssue | null, form: UseFormReturn<T>) {
  useEffect(() => {
    for (const [name, message] of Object.entries(issue?.fields ?? {}))
      form.setError(name as FieldPath<T>, { message });
  }, [issue, form]);
}
export function ActionIssue({ issue, recovery }: { issue: BusinessIssue | null; recovery: ReactNode }) {
  if (!issue) return null;
  return (
    <div
      role="alert"
      className="bg-warning-soft text-warning-soft-foreground space-y-2 rounded-md p-4 text-sm"
    >
      <p>{issue.message}</p>
      {["refresh-uncertain", "unauthorized"].includes(issue.kind) && recovery}
    </div>
  );
}
function usePermissions(issue: BusinessIssue | null) {
  const client = useQueryClient();
  useEffect(() => {
    if (issue?.kind === "forbidden" || issue?.kind === "not-found")
      void client.invalidateQueries({ queryKey: ["workspace"] });
  }, [client, issue?.kind]);
}
interface Fields<T extends FieldValues> {
  schema: z.ZodType<T>;
  defaults: NoInfer<T>;
  active: boolean;
  recovery: ReactNode;
  label: string;
  onClose?: () => void;
  children: (form: UseFormReturn<T>, disabled: boolean) => ReactNode;
}

export function PostForm<T extends FieldValues, R>({
  schema,
  defaults,
  active,
  recovery,
  label,
  children,
  execute,
  onSuccess,
  onClose,
  versionRead,
}: Fields<T> & {
  execute: (value: T, key: string) => Promise<R>;
  onSuccess: (value: R) => void;
  versionRead?: { queryKey: QueryKey; read: (signal: AbortSignal) => Promise<{ version: number }> };
}) {
  const { form, validate } = useFields(schema, defaults);
  const command = usePostCommand(execute, (value) => {
    notify.success("Действие выполнено");
    onSuccess(value);
  });
  usePermissions(command.issue);
  useServerFields(command.issue, form);
  usePendingCommand(command.pending || command.uncertain, command.pending);
  const readVersion = versionRead?.read ?? (() => Promise.resolve({ version: 1 }));
  const current = useQuery({
    queryKey: versionRead?.queryKey ?? ["inactive-version-read", label],
    queryFn: ({ signal }) => readVersion(signal),
    enabled: false,
    retry: false,
  });
  const conflict =
    Boolean(versionRead) &&
    !command.uncertain &&
    (command.issue?.kind === "version-conflict" || command.issue?.kind === "conflict");
  const close = () => {
    if (command.uncertain) return;
    onClose?.();
  };
  const disabled = !active || command.pending || command.uncertain || conflict;
  return (
    <>
      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          if (!active || command.pending || command.retryLeft > 0 || conflict) {
            event.preventDefault();
            return;
          }
          if (command.uncertain) {
            event.preventDefault();
            void command.repeat();
          } else void form.handleSubmit((value) => validate(value, command.send))(event);
        }}
      >
        {children(form, disabled)}
        <ActionIssue issue={command.issue} recovery={recovery} />
        {conflict && (
          <div className="bg-warning-soft text-warning-soft-foreground space-y-3 rounded-md p-4 text-sm">
            <p>Перечитайте ресурс и явно примите версию. После этого отправьте новую команду отдельно.</p>
            <Button
              className="min-h-control-md h-auto max-w-full py-2 whitespace-normal"
              variant="secondary"
              size="sm"
              loading={current.isFetching}
              onClick={() => void current.refetch()}
            >
              Перечитать данные
            </Button>
            {current.isError && <ActionIssue issue={businessIssue(current.error)} recovery={recovery} />}
            {current.data && !current.isFetching && !current.isError && (
              <Button
                className="min-h-control-md h-auto max-w-full py-2 whitespace-normal"
                size="sm"
                variant="secondary"
                disabled={!active}
                onClick={() => {
                  form.setValue("version" as FieldPath<T>, current.data.version as T[FieldPath<T>]);
                  command.clearKnownError();
                }}
              >
                Принять актуальную версию
              </Button>
            )}
          </div>
        )}
        {command.uncertain && (
          <p role="status" className="text-warning-soft-foreground text-sm">
            Ответ не получен. Повтор отправит прежние данные с тем же ключом, без создания второй команды.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            className="min-h-control-md h-auto max-w-full py-2 whitespace-normal"
            type="submit"
            loading={command.pending}
            disabled={!active || command.retryLeft > 0 || conflict}
          >
            {command.retryLeft > 0
              ? `Повторить через ${command.retryLeft} с`
              : command.uncertain
                ? "Повторить ту же команду"
                : label}
          </Button>
          {onClose && (
            <Button
              className="min-h-control-md h-auto max-w-full py-2 whitespace-normal"
              variant="secondary"
              disabled={command.pending || command.uncertain}
              onClick={close}
            >
              Отмена
            </Button>
          )}
        </div>
      </form>
    </>
  );
}

export function VersionedForm<T extends FieldValues, R extends { version: number }>({
  schema,
  defaults,
  resource,
  active,
  recovery,
  label,
  children,
  read,
  write,
  onSaved,
  queryKey,
  onClose,
}: Fields<T> & {
  resource: R;
  queryKey: QueryKey;
  read: (signal: AbortSignal) => Promise<R>;
  write: (value: T, version: number) => Promise<R>;
  onSaved: (value: R) => void;
}) {
  const { form, validate } = useFields(schema, defaults);
  const editor = useVersionedEdit({ resource, active, queryKey, read, write, onSaved });
  usePermissions(editor.issue);
  useServerFields(editor.issue, form);
  usePendingCommand(editor.pending || editor.blocked, editor.pending);
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={form.handleSubmit((value) => validate(value, editor.submit))}
    >
      {children(form, !active || editor.pending || editor.blocked)}
      <ActionIssue issue={editor.issue} recovery={recovery} />
      {editor.blocked && (
        <div className="bg-warning-soft text-warning-soft-foreground space-y-3 rounded-md p-4 text-sm">
          <p role="alert">
            Данные изменились или ответ на сохранение потерян. Черновик сохранён. Перечитайте ресурс и примите
            актуальную версию перед отдельным сохранением.
          </p>
          {editor.current.isError && (
            <ActionIssue issue={businessIssue(editor.current.error)} recovery={recovery} />
          )}
          <Button
            className="min-h-control-md h-auto max-w-full py-2 whitespace-normal"
            variant="secondary"
            size="sm"
            loading={editor.current.isFetching}
            onClick={() => void editor.current.refetch()}
          >
            Перечитать данные
          </Button>
          {editor.current.data && !editor.current.isError && !editor.current.isFetching && (
            <Button
              className="min-h-control-md h-auto max-w-full py-2 whitespace-normal"
              variant="secondary"
              size="sm"
              disabled={!active}
              onClick={() => {
                editor.choose();
              }}
            >
              Оставить мой вариант с актуальной версией
            </Button>
          )}
        </div>
      )}
      {editor.message && (
        <p role="status" className="text-muted-foreground text-sm">
          {editor.message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          className="min-h-control-md h-auto max-w-full py-2 whitespace-normal"
          type="submit"
          loading={editor.pending}
          disabled={!active || editor.blocked || editor.retryLeft > 0}
        >
          {editor.retryLeft > 0 ? `Повторить через ${editor.retryLeft} с` : label}
        </Button>
        {onClose && (
          <Button
            className="min-h-control-md h-auto max-w-full py-2 whitespace-normal"
            variant="secondary"
            disabled={editor.pending}
            onClick={onClose}
          >
            Отмена
          </Button>
        )}
      </div>
    </form>
  );
}

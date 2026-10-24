import { useEffect, useId, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating, useMutation, useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { Button, Field, Input, notify } from "@zapas/ui";
import {
  AuthProblem,
  authIssue,
  profileSchema,
  useAuthPort,
  useSessionRecovery,
  type AuthProfile,
} from "@/entities/auth-profile";

export function ProfileForm({
  profile,
  onSaved,
  onExpired,
}: {
  profile: AuthProfile;
  onSaved: (profile: AuthProfile) => void;
  onExpired: () => Promise<void>;
}) {
  const port = useAuthPort();
  const readProfile =
    port?.readProfile ??
    ((_signal: AbortSignal) =>
      Promise.reject(new AuthProblem({ kind: "unavailable", message: "Сервис профиля пока недоступен." })));
  const id = useId();
  const mounted = useRef(false);
  const locked = useRef(false);
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const busy = useIsMutating({ mutationKey: ["auth-profile"] }) > 0;
  const recovery = useSessionRecovery(onExpired);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: profile.displayName ?? "", version: profile.version },
  });
  const current = useQuery({
    queryKey: ["auth-profile", "conflict", profile.id],
    enabled: false,
    retry: false,
    queryFn: ({ signal }) => readProfile(signal),
  });
  useEffect(() => {
    if (current.isError && authIssue(current.error).kind === "session-expired") void onExpired();
  }, [current.isError, current.error, onExpired]);
  const save = useMutation({
    mutationKey: ["auth-profile", "save"],
    retry: false,
    mutationFn: (value: z.infer<typeof profileSchema>) => {
      if (!port) throw new AuthProblem({ kind: "unavailable", message: "Сервис профиля пока недоступен." });
      return port.saveProfile(value);
    },
  });
  const submit = async (value: z.infer<typeof profileSchema>) => {
    if (locked.current || conflict) return;
    locked.current = true;
    setMessage(null);
    try {
      const saved = await save.mutateAsync(value);
      if (mounted.current) {
        form.reset({ displayName: saved.displayName ?? "", version: saved.version });
        onSaved(saved);
        notify.success("Имя сохранено");
      }
    } catch (error) {
      if (!mounted.current) return;
      const issue = authIssue(error);
      if (issue.kind === "session-expired") {
        await onExpired();
        return;
      }
      if (issue.kind === "profile-conflict") {
        setConflict(true);
        notify.warning("Профиль изменён в другой сессии");
        await current.refetch();
      } else {
        if (issue.fields?.displayName) form.setError("displayName", { message: issue.fields.displayName });
        setMessage(issue.message);
        notify.error(issue.message);
      }
    } finally {
      locked.current = false;
    }
  };
  const choose = (keepDraft: boolean) => {
    if (!current.data || current.isFetching || current.isError) return;
    if (keepDraft) form.setValue("version", current.data.version, { shouldDirty: true });
    else form.reset({ displayName: current.data.displayName ?? "", version: current.data.version });
    setConflict(false);
    setMessage("Нажмите «Сохранить имя», чтобы подтвердить изменение.");
  };
  return (
    <section aria-labelledby={`${id}-title`} className="border-border bg-card rounded-lg border p-5 sm:p-6">
      <h2 id={`${id}-title`} className="text-xl font-semibold">
        Ваш профиль
      </h2>
      <p className="text-muted-foreground mt-3 text-sm break-all">Почта: {profile.email}</p>
      <p className="text-muted-foreground mt-2 text-sm">
        Имя относится к человеку. Реквизиты организации настраиваются отдельно.
      </p>
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit(submit)(event);
        }}
        className="mt-5 flex flex-col gap-4"
      >
        <Controller
          name="displayName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field htmlFor={`${id}-name`} label="Имя" error={fieldState.error?.message}>
              <Input
                id={`${id}-name`}
                {...field}
                disabled={busy}
                autoComplete="name"
                invalid={Boolean(fieldState.error)}
                aria-describedby={fieldState.error ? `${id}-name-error` : undefined}
              />
            </Field>
          )}
        />
        {((save.isError && authIssue(save.error).kind === "refresh-uncertain") ||
          (current.isError && authIssue(current.error).kind === "refresh-uncertain")) && (
          <Button
            variant="secondary"
            className="w-fit"
            disabled={busy}
            loading={recovery.isPending}
            onClick={() =>
              recovery.mutate(undefined, {
                onSuccess: () => {
                  save.reset();
                  setMessage("Сессия обновлена. Проверьте форму и сохраните имя ещё раз.");
                },
              })
            }
          >
            Обновить сессию
          </Button>
        )}
        {message && (
          <p role="status" className="text-muted-foreground text-sm">
            {message}
          </p>
        )}
        {conflict && (
          <div className="border-border bg-warning-soft rounded-md border p-4">
            <p role="alert" className="text-warning-soft-foreground font-medium">
              Профиль изменён в другой сессии.
            </p>
            {current.isFetching && (
              <p role="status" className="mt-2 text-sm">
                Загружаем обновлённый профиль…
              </p>
            )}
            {current.isError && (
              <div>
                <p role="alert" className="text-danger mt-2 text-sm">
                  {authIssue(current.error).message} Ваш вариант остался в форме.
                </p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => void current.refetch()}>
                  Перечитать профиль
                </Button>
              </div>
            )}
            {current.data && !current.isFetching && !current.isError && (
              <>
                <p className="mt-3 text-sm">
                  Сейчас в профиле:{" "}
                  <span className="font-medium break-words">
                    {current.data.displayName ?? "Имя не указано"}
                  </span>
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Выберите, какое имя оставить. Сохранение потребуется подтвердить отдельно.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button size="sm" variant="secondary" onClick={() => choose(true)}>
                    Оставить мой вариант
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => choose(false)}>
                    Загрузить имя из профиля
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
        <Button
          type="submit"
          className="w-fit"
          loading={save.isPending}
          disabled={busy || conflict || form.formState.isSubmitting}
        >
          Сохранить имя
        </Button>
      </form>
    </section>
  );
}

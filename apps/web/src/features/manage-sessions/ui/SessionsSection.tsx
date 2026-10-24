import { useEffect, useId, useRef, useState } from "react";
import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Skeleton, confirmDialog, notify } from "@zapas/ui";
import {
  AuthProblem,
  authIssue,
  profileKeys,
  useAuthPort,
  useSessions,
  useSessionRecovery,
  usePrivateQueries,
  type BrowserSession,
} from "@/entities/auth-profile";

const dateTime = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" });
function timestamp(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? dateTime.format(date) : "Дата недоступна";
}

export function SessionsSection({ onSessionEnded }: { onSessionEnded: () => Promise<void> }) {
  const id = useId();
  const port = useAuthPort();
  const client = useQueryClient();
  const { setPrivateQueries } = usePrivateQueries();
  const query = useSessions();
  const recovery = useSessionRecovery(onSessionEnded);
  const globalBusy = useIsMutating({ mutationKey: ["auth-profile"] }) > 0;
  const locked = useRef(false);
  const mounted = useRef(false);
  const isMounted = () => mounted.current;
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (query.isError && authIssue(query.error).kind === "session-expired") void onSessionEnded();
  }, [query.isError, query.error, onSessionEnded]);
  const revoke = useMutation({
    mutationKey: ["auth-profile", "revoke"],
    retry: false,
    mutationFn: (sessionId: string | null) => {
      if (!port) throw new AuthProblem({ kind: "unavailable", message: "Сервис сессий пока недоступен." });
      return sessionId === null ? port.revokeAllSessions() : port.revokeSession(sessionId);
    },
  });
  const end = async (session: BrowserSession | null) => {
    if (locked.current || globalBusy) return;
    locked.current = true;
    setConfirming(true);
    setError(null);
    try {
      const endsCurrent = session === null || session.current;
      const agreed = await confirmDialog({
        title:
          session === null
            ? "Завершить все сессии?"
            : session.current
              ? "Завершить текущую сессию?"
              : "Завершить эту сессию?",
        description: endsCurrent
          ? "Вы выйдете из Запаса. Для следующего входа понадобится код из письма."
          : "Эта сессия больше не сможет обновлять доступ.",
        confirmLabel: "Завершить",
        tone: "default",
      });
      if (!agreed || !isMounted()) return;
      if (endsCurrent) {
        setPrivateQueries(false);
        await client.cancelQueries();
      }
      await revoke.mutateAsync(session?.id ?? null);
      if (endsCurrent) await onSessionEnded();
      else if (isMounted()) {
        await client.invalidateQueries({ queryKey: profileKeys.sessions });
        notify.success("Сессия завершена");
      }
    } catch (failure) {
      const issue = authIssue(failure);
      if (issue.kind === "session-expired") await onSessionEnded();
      else {
        setPrivateQueries(true);
        if (!mounted.current) return;
        setError(issue.message);
        notify.error(issue.message);
      }
    } finally {
      locked.current = false;
      if (mounted.current) setConfirming(false);
    }
  };
  const busy = globalBusy || confirming;
  return (
    <section aria-labelledby={id} className="border-border bg-card rounded-lg border p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id={id} className="text-xl font-semibold">
          Ваши сессии
        </h2>
        <Button
          variant="ghost"
          size="sm"
          loading={query.isFetching}
          disabled={busy}
          onClick={() => void query.refetch()}
        >
          Обновить список
        </Button>
      </div>
      <p className="text-muted-foreground mt-3 text-sm">
        Последняя активность относится к входу и профилю. Время показано в часовом поясе вашего браузера.
      </p>
      <p className="text-muted-foreground mt-2 text-sm">
        Отозванная сессия не сможет обновить доступ. Уже выданный доступ может сохраняться до истечения его
        срока.
      </p>
      {query.isPending && (
        <div role="status" aria-label="Загрузка сессий" className="mt-4 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}
      {query.isError && (
        <p role="alert" className="text-danger mt-4">
          {authIssue(query.error).message}
          {query.data ? " Показан сохранённый список." : " Повторите загрузку списка."}
        </p>
      )}
      {error && (
        <p role="alert" className="text-danger mt-4">
          {error}
        </p>
      )}
      {((query.isError && authIssue(query.error).kind === "refresh-uncertain") ||
        (revoke.isError && authIssue(revoke.error).kind === "refresh-uncertain")) && (
        <Button
          variant="secondary"
          className="mt-3"
          disabled={busy}
          loading={recovery.isPending}
          onClick={() =>
            recovery.mutate(undefined, {
              onSuccess: () => {
                setError(null);
                revoke.reset();
              },
            })
          }
        >
          Обновить сессию
        </Button>
      )}
      {query.data?.length === 0 && <p className="text-muted-foreground mt-4">Список сессий пуст.</p>}
      {query.data && query.data.length > 0 && (
        <>
          <ul className="mt-4 space-y-3">
            {query.data.map((session, index) => (
              <li
                key={session.id}
                className="border-border flex flex-col gap-4 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="font-semibold">
                    {session.current ? "Текущая сессия" : `Сессия ${index + 1}`}
                  </h3>
                  <dl className="text-muted-foreground mt-2 space-y-1 text-sm">
                    <div>
                      <dt className="inline">Создана: </dt>
                      <dd className="inline">{timestamp(session.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="inline">Активность: </dt>
                      <dd className="inline">{timestamp(session.lastSeenAt)}</dd>
                    </div>
                    <div>
                      <dt className="inline">Истекает: </dt>
                      <dd className="inline">{timestamp(session.expiresAt)}</dd>
                    </div>
                  </dl>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  className="w-fit"
                  aria-label={session.current ? "Завершить текущую сессию" : `Завершить сессию ${index + 1}`}
                  onClick={() => void end(session)}
                >
                  Завершить
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" className="mt-4" disabled={busy} onClick={() => void end(null)}>
            Завершить все сессии
          </Button>
        </>
      )}
    </section>
  );
}

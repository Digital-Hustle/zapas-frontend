import { useCallback, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Skeleton } from "@zapas/ui";
import {
  authIssue,
  resetPrivateSession,
  sessionGate,
  useAuthPort,
  useProfile,
  useSessionRecovery,
  usePrivateQueries,
} from "@/entities/auth-profile";

export function RequireAuth({ loginPath = "/login" }: { loginPath?: string }) {
  const port = useAuthPort();
  const query = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { privateQueries, setPrivateQueries } = usePrivateQueries();
  const end = useCallback(async () => {
    setPrivateQueries(false);
    await resetPrivateSession(client, null);
    void navigate(loginPath, { replace: true, state: { from: location.pathname } });
  }, [client, navigate, loginPath, location.pathname, setPrivateQueries]);
  const recovery = useSessionRecovery(end);
  const issue = query.isError ? authIssue(query.error) : null;
  const state = sessionGate({
    available: Boolean(port),
    hasProfile: Boolean(query.data),
    pending: query.isPending,
    failure: issue?.kind ?? null,
  });
  useEffect(() => {
    if (state === "expired") void end();
  }, [state, end]);
  if (state === "expired")
    return (
      <p role="status" className="p-6">
        Сессия закончилась. Открываем вход…
      </p>
    );
  if (state === "loading" || (!privateQueries && !query.data))
    return (
      <div
        className="max-w-content mx-auto flex flex-col gap-4 p-6"
        role="status"
        aria-label="Загрузка профиля"
      >
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  if (state === "unavailable" || state === "error")
    return (
      <main className="max-w-content mx-auto flex flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Кабинет временно недоступен</h1>
        <p role="alert" className="text-muted-foreground">
          {state === "unavailable" ? "Сервис входа пока недоступен." : issue?.message}
        </p>
        {port &&
          (issue?.kind === "refresh-uncertain" ? (
            <>
              <Button className="w-fit" loading={recovery.isPending} onClick={() => recovery.mutate()}>
                Обновить сессию
              </Button>
              <Link to={loginPath} className="text-link underline">
                Войти снова
              </Link>
            </>
          ) : (
            <Button className="w-fit" onClick={() => void query.refetch()}>
              Повторить
            </Button>
          ))}
      </main>
    );
  return (
    <>
      {issue && (
        <div className="border-border bg-warning-soft text-warning-soft-foreground border-b p-4">
          <p role="alert">{issue.message} Показан сохранённый профиль.</p>
          {issue.kind === "refresh-uncertain" && (
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                loading={recovery.isPending}
                onClick={() => recovery.mutate()}
              >
                Обновить сессию
              </Button>
              <Link to={loginPath} className="text-link underline">
                Войти снова
              </Link>
            </div>
          )}
        </div>
      )}
      <Outlet />
    </>
  );
}

import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Skeleton } from "@zapas/ui";
import {
  authIssue,
  resetPrivateSession,
  sessionGate,
  useAuthPort,
  useProfile,
} from "@/entities/auth-profile";

export function RequireAuth({ loginPath = "/login" }: { loginPath?: string }) {
  const port = useAuthPort();
  const query = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const issue = query.isError ? authIssue(query.error) : null;
  const state = sessionGate({
    available: Boolean(port),
    hasProfile: Boolean(query.data),
    pending: query.isPending,
    failure: issue?.kind ?? null,
  });
  useEffect(() => {
    if (state === "expired")
      void resetPrivateSession(client, null).then(() =>
        navigate(loginPath, { replace: true, state: { from: location.pathname } }),
      );
  }, [state, client, navigate, loginPath, location.pathname]);
  if (state === "expired")
    return (
      <p role="status" className="p-6">
        Сессия закончилась. Открываем вход…
      </p>
    );
  if (state === "loading")
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
        {port && (
          <Button className="w-fit" onClick={() => void query.refetch()}>
            Повторить
          </Button>
        )}
      </main>
    );
  return (
    <>
      {issue && (
        <p role="alert" className="border-border bg-warning-soft text-warning-soft-foreground border-b p-4">
          {issue.message} Показан сохранённый профиль.
        </p>
      )}
      <Outlet />
    </>
  );
}

import { useCallback, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, buttonVariants, notify } from "@zapas/ui";
import {
  AuthProblem,
  authIssue,
  profileKeys,
  resetPrivateSession,
  useAuthPort,
  useProfile,
} from "@/entities/auth-profile";
import { ProfileForm } from "@/features/manage-profile";
import { SessionsSection } from "@/features/manage-sessions";
import { Logo } from "@/shared/ui";

export function ProfilePage({ loginPath = "/login" }: { loginPath?: string }) {
  const port = useAuthPort();
  const query = useProfile();
  const client = useQueryClient();
  const navigate = useNavigate();
  const locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useIsMutating({ mutationKey: ["auth-profile"] }) > 0;
  const end = useCallback(async () => {
    await resetPrivateSession(client, null);
    void navigate(loginPath, { replace: true });
  }, [client, navigate, loginPath]);
  const logout = useMutation({
    mutationKey: ["auth-profile", "logout"],
    retry: false,
    mutationFn: () => {
      if (!port) throw new AuthProblem({ kind: "unavailable", message: "Сервис входа пока недоступен." });
      return port.logout();
    },
  });
  const leave = async () => {
    if (locked.current || busy) return;
    locked.current = true;
    setError(null);
    try {
      await logout.mutateAsync();
      await end();
    } catch (failure) {
      const issue = authIssue(failure);
      if (issue.kind === "session-expired") await end();
      else {
        setError(issue.message);
        notify.error(issue.message);
      }
    } finally {
      locked.current = false;
    }
  };
  if (!query.data) return null;
  return (
    <div className="bg-background min-h-svh">
      <header className="border-border border-b">
        <div className="max-w-content mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <Logo to="/app" />
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/app" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Кабинет
            </Link>
            <Button
              variant="secondary"
              size="sm"
              loading={logout.isPending}
              disabled={busy}
              onClick={() => void leave()}
            >
              Выйти
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-content mx-auto flex flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Профиль и сессии</h1>
          <Button
            variant="ghost"
            size="sm"
            loading={query.isFetching}
            disabled={busy}
            onClick={() => void query.refetch()}
          >
            Обновить профиль
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <ProfileForm
            profile={query.data}
            onSaved={(profile) => client.setQueryData(profileKeys.profile, profile)}
            onExpired={end}
          />
          <SessionsSection onSessionEnded={end} />
        </div>
      </main>
    </div>
  );
}

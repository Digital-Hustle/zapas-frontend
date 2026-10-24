import { useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { Button, notify } from "@zapas/ui";
import { resetPrivateSession, usePrivateQueries, useSessionRecovery } from "@/entities/auth-profile";

export function RecoveryAction({ queryKey }: { queryKey?: QueryKey }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const { setPrivateQueries } = usePrivateQueries();
  const end = useCallback(async () => {
    setPrivateQueries(false);
    await resetPrivateSession(client, null);
    void navigate("/login", { replace: true });
  }, [client, navigate, setPrivateQueries]);
  const recovery = useSessionRecovery(end);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        loading={recovery.isPending}
        onClick={() =>
          recovery.mutate(undefined, {
            onSuccess: () => {
              void client.invalidateQueries(queryKey ? { queryKey } : undefined);
              notify.success("Сессия обновлена. Повторите нужное действие.");
            },
          })
        }
      >
        Обновить сессию
      </Button>
      <Link to="/login" className="text-link underline">
        Войти снова
      </Link>
    </div>
  );
}

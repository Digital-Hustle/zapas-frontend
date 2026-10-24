import { useEffect, useSyncExternalStore } from "react";
import { useBlocker } from "react-router";
import { Button, Dialog } from "@zapas/ui";
import { pendingCommands } from "@/shared/lib/pending-commands.ts";

function ActiveGuard({ pending }: { pending: boolean }) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search,
  );
  return (
    <Dialog
      open={blocker.state === "blocked"}
      onOpenChange={(open) => {
        if (!open && blocker.state === "blocked") blocker.reset();
      }}
      title="Проверить результат перед переходом?"
      description="Команда уже могла выполниться. После перехода перечитайте данные перед новым действием."
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
          disabled={pending}
          onClick={() => {
            if (blocker.state === "blocked") blocker.proceed();
          }}
        >
          Перейти и проверить данные
        </Button>
      </div>
    </Dialog>
  );
}
export function PendingCommandsGuard() {
  const state = useSyncExternalStore(pendingCommands.subscribe, pendingCommands.snapshot);
  useEffect(() => {
    if (!state.locked) return;
    const before = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [state.locked]);
  return state.locked ? <ActiveGuard pending={state.pending} /> : null;
}

// confirmDialog() → Promise<boolean>. Замена window.confirm, рендерится одним хостом <ConfirmHost/>.
import { useSyncExternalStore } from "react";
import { Button } from "../components/Button.tsx";
import { Dialog } from "../components/Dialog.tsx";

interface ConfirmRequest {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  resolve: (ok: boolean) => void;
}

let current: ConfirmRequest | null = null;
let open = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function confirmDialog(
  req: Omit<ConfirmRequest, "resolve">,
): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...req, resolve };
    open = true;
    emit();
  });
}

function settle(ok: boolean) {
  current?.resolve(ok);
  open = false;
  emit();
}

const snapshot = () => (open ? current : null);

export function ConfirmHost() {
  const req = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (open ? current : null),
    snapshot,
  );
  const shown = req ?? current;
  return (
    <Dialog
      open={Boolean(req)}
      onOpenChange={(o) => !o && settle(false)}
      onClosed={() => {
        current = null;
      }}
      title={shown?.title ?? ""}
      description={shown?.description}
      size="sm"
      layer="popover"
      footer={
        <>
          <Button variant="ghost" onClick={() => settle(false)}>
            {shown?.cancelLabel ?? "Отмена"}
          </Button>
          <Button
            variant={shown?.tone === "danger" ? "danger" : "primary"}
            onClick={() => settle(true)}
            autoFocus
          >
            {shown?.confirmLabel ?? "Подтвердить"}
          </Button>
        </>
      }
    />
  );
}

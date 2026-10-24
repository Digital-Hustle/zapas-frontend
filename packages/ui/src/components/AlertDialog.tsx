import { useRef, useState } from "react";
import { Dialog, type DialogProps } from "./Dialog.tsx";
import { Button } from "./Button.tsx";
import { notify } from "../feedback/notify.tsx";

export interface AlertDialogProps extends Omit<DialogProps, "busy" | "footer" | "role" | "dismissOnOutside"> {
  onConfirm: () => Promise<void> | void;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
}
/** Keeps a failed operation open and never retries it automatically. */
export function AlertDialog({
  onConfirm,
  confirmLabel,
  cancelLabel = "Отмена",
  danger,
  children,
  onOpenChange,
  ...props
}: AlertDialogProps) {
  const locked = useRef(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const change = (open: boolean) => {
    if (!locked.current) {
      setError("");
      onOpenChange(open);
    }
  };
  const handleConfirm = async () => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      const message = "Действие не завершено. Проверьте результат перед повторной попыткой.";
      setError(message);
      notify.error(message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <Dialog
      {...props}
      role="alertdialog"
      dismissOnOutside={false}
      onOpenChange={change}
      busy={busy}
      initialFocusRef={cancel}
      footer={
        <>
          <Button ref={cancel} variant="secondary" disabled={busy} onClick={() => change(false)}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} onClick={() => void handleConfirm()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && (
        <p role="alert" className="text-danger mt-3 text-sm">
          {error}
        </p>
      )}
    </Dialog>
  );
}

export function Sheet(props: Omit<DialogProps, "placement">) {
  return <Dialog {...props} placement="bottom" />;
}

import { useEffect, useRef, useState } from "react";
import { Button } from "./Button.tsx";
import { notify } from "../feedback/notify.tsx";

export interface ResendCodeProps {
  /** Absolute server deadline, epoch milliseconds; null means unknown, never immediately available. */
  resendAt: number | null;
  onResend: () => Promise<void> | void;
  disabled?: boolean;
}
export function ResendCode({ resendAt, onResend, disabled }: ResendCodeProps) {
  const [now, setNow] = useState(Date.now);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  const seconds =
    resendAt !== null && Number.isFinite(resendAt) ? Math.max(0, Math.ceil((resendAt - now) / 1000)) : null;
  const unavailable = disabled || seconds !== 0;
  const resend = async () => {
    if (locked.current || unavailable) return;
    locked.current = true;
    setPending(true);
    setError("");
    try {
      await onResend();
    } catch {
      const message = "Не удалось повторно запросить код. Проверьте соединение и повторите попытку.";
      setError(message);
      notify.error(message);
    } finally {
      locked.current = false;
      setPending(false);
    }
  };
  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="ghost" disabled={unavailable} loading={pending} onClick={() => void resend()}>
        {seconds === null
          ? "Повторная отправка пока недоступна"
          : seconds > 0
            ? `Повторить через ${seconds} с`
            : "Отправить код ещё раз"}
      </Button>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";

const secondsLeft = (until: number | null) =>
  until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0;

/** Секунды до момента `until` (ms epoch). Тикает по таймеру, без дрейфа. */
export function useCountdown(until: number | null) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!until) return;
    const id = setInterval(() => {
      tick((n) => n + 1);
      if (secondsLeft(until) <= 0) clearInterval(id);
    }, 250);
    return () => clearInterval(id);
  }, [until]);
  return secondsLeft(until);
}

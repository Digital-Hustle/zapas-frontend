import { useEffect } from "react";
import { queryClient } from "./query.ts";

type Handler = (type: string, data: unknown) => void;

/**
 * Подписка на /api/v1/notify/stream. EventSource сам переподключается и шлёт Last-Event-ID.
 * На forecast-updated инвалидирует запросы прогноза — экраны обновятся без перезагрузки.
 */
export function useEventStream(onEvent?: Handler) {
  useEffect(() => {
    const es = new EventSource("/api/v1/notify/stream", {
      withCredentials: true,
    });
    const handle = (type: string) => (e: MessageEvent<string>) => {
      let data: unknown = null;
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (type === "forecast-updated")
        void queryClient.invalidateQueries({
          predicate: (q) => String(q.queryKey[0]).includes("/forecast/"),
        });
      if (type === "notification")
        void queryClient.invalidateQueries({
          predicate: (q) => String(q.queryKey[0]).includes("/notify/"),
        });
      onEvent?.(type, data);
    };
    const types = ["notification", "forecast-updated", "job"];
    const listeners = types.map((t) => [t, handle(t)] as const);
    listeners.forEach(([t, l]) => es.addEventListener(t, l));
    return () => {
      listeners.forEach(([t, l]) => es.removeEventListener(t, l));
      es.close();
    };
  }, [onEvent]);
}

import { useEffect, useRef, useSyncExternalStore } from "react";

const locks = new Map<symbol, boolean>();
const listeners = new Set<() => void>();
let snapshot = { locked: false, pending: false };
function emit() {
  snapshot = { locked: locks.size > 0, pending: [...locks.values()].some(Boolean) };
  for (const listener of listeners) listener();
}
export const pendingCommands = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  snapshot: () => snapshot,
};
export function usePendingCommand(locked: boolean, pending: boolean) {
  const id = useRef(Symbol("command"));
  useEffect(() => {
    const key = id.current;
    if (locked) locks.set(key, pending);
    else locks.delete(key);
    emit();
    return () => {
      locks.delete(key);
      emit();
    };
  }, [locked, pending]);
}

export function useCommandLock() {
  return useSyncExternalStore(pendingCommands.subscribe, pendingCommands.snapshot);
}

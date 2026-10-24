import type { AuthFailureKind } from "./types.ts";
export function sessionGate(state: {
  available: boolean;
  hasProfile: boolean;
  pending: boolean;
  failure: AuthFailureKind | null;
}) {
  if (!state.available) return "unavailable";
  if (state.failure === "session-expired") return "expired";
  if (state.hasProfile) return "ready";
  return state.pending ? "loading" : "error";
}

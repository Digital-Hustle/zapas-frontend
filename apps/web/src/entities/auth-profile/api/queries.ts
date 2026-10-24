import { useQuery } from "@tanstack/react-query";
import { useAuthPort, usePrivateQueries } from "../model/context.ts";
import { AuthProblem } from "../model/errors.ts";

export const profileKeys = {
  profile: ["auth-profile", "me"] as const,
  sessions: ["auth-profile", "sessions"] as const,
};

export function useProfile() {
  const port = useAuthPort();
  const { privateQueries } = usePrivateQueries();
  const readProfile =
    port?.readProfile ??
    ((_signal: AbortSignal) =>
      Promise.reject(new AuthProblem({ kind: "unavailable", message: "Сервис входа пока недоступен." })));
  return useQuery({
    queryKey: profileKeys.profile,
    queryFn: ({ signal }) => readProfile(signal),
    enabled: Boolean(port) && privateQueries,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useSessions() {
  const port = useAuthPort();
  const { privateQueries } = usePrivateQueries();
  const readSessions =
    port?.readSessions ??
    ((_signal: AbortSignal) =>
      Promise.reject(new AuthProblem({ kind: "unavailable", message: "Сервис входа пока недоступен." })));
  return useQuery({
    queryKey: profileKeys.sessions,
    queryFn: ({ signal }) => readSessions(signal),
    enabled: Boolean(port) && privateQueries,
    retry: false,
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "@zapas/ui";
import { useAuthPort } from "../model/context.ts";
import { AuthProblem, authIssue } from "../model/errors.ts";

/** User action only: uncertain refreshes must never be rotated by an automatic retry. */
export function useSessionRecovery(onExpired: () => Promise<void>) {
  const port = useAuthPort();
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["auth-profile", "recover"],
    retry: false,
    mutationFn: () => {
      if (!port) throw new AuthProblem({ kind: "unavailable", message: "Сервис входа пока недоступен." });
      return port.recoverSession();
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["auth-profile"] });
    },
    onError: async (error) => {
      const issue = authIssue(error);
      if (issue.kind === "session-expired") await onExpired();
      else notify.error(issue.message);
    },
  });
}

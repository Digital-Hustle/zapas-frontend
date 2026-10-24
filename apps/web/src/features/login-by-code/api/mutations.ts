import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AuthProblem, resetPrivateSession, useAuthPort } from "@/entities/auth-profile";

export function useRequestCode() {
  const port = useAuthPort();
  return useMutation({
    mutationKey: ["auth-profile", "code"],
    retry: false,
    mutationFn: (email: string) => {
      if (!port) throw new AuthProblem({ kind: "unavailable", message: "Сервис входа пока недоступен." });
      return port.requestChallenge(email);
    },
  });
}

export function useVerifyCode() {
  const port = useAuthPort();
  const client = useQueryClient();
  return useMutation({
    mutationKey: ["auth-profile", "verify"],
    retry: false,
    mutationFn: ({ challengeId, code }: { challengeId: string; code: string }) => {
      if (!port) throw new AuthProblem({ kind: "unavailable", message: "Сервис входа пока недоступен." });
      return port.verifyChallenge(challengeId, code);
    },
    onSuccess: async ({ profile }) => {
      await resetPrivateSession(client, profile);
    },
  });
}

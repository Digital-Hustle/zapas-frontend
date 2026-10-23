import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@zapas/api";
import { sessionKeys } from "@/entities/session";

// После генерации клиента заменить на useRequestLoginCode / useVerifyLoginCode из @zapas/api/auth.
export interface CodeRs {
  maskedEmail: string;
  expiresInSec: number;
  resendAfterSec: number;
  codeLength: number;
  demoCode?: string;
}

export const useRequestCode = () =>
  useMutation({
    mutationFn: (email: string) =>
      http<CodeRs>("/api/v1/auth/code", {
        method: "POST",
        body: JSON.stringify({ email, client: "WEB" }),
        silent: true,
      }),
  });

export const useVerifyCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { email: string; code: string }) =>
      http<{ isNewUser: boolean }>("/api/v1/auth/verify", {
        method: "POST",
        body: JSON.stringify({ ...v, client: "WEB" }),
        silent: true,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionKeys.me }),
  });
};

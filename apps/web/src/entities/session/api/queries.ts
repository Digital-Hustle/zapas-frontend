import { useQuery } from "@tanstack/react-query";
import { http } from "@zapas/api";

// После `pnpm --filter @zapas/api gen` заменить на сгенерированный useGetMe из @zapas/api/auth.
export interface Me {
  user: {
    id: string;
    email: string;
    name?: string;
    timezone: string;
    platformAdmin: boolean;
  };
  companies: {
    company: { id: string; name: string };
    role: "OWNER" | "ACCOUNTANT" | "VIEWER";
  }[];
}

export const sessionKeys = { me: ["/api/v1/auth/me"] as const };

export const useSession = () =>
  useQuery({
    queryKey: sessionKeys.me,
    queryFn: ({ signal }) =>
      http<Me>("/api/v1/auth/me", { signal, silent: true }),
    staleTime: 5 * 60_000,
    retry: false,
  });

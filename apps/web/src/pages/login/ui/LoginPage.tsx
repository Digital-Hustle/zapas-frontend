import { useLocation, useNavigate } from "react-router";
import { LoginByCode } from "@/features/login-by-code";
import { Logo } from "@/shared/ui";

export function LoginPage({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const navigate = useNavigate();
  const target = (useLocation().state as { from?: unknown } | null)?.from;
  const from = typeof target === "string" && /^\/app(?:\/|$)/u.test(target) ? target : "/app";
  return (
    <main className="bg-background grid min-h-svh lg:grid-cols-2">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <LoginByCode
            onSuccess={
              onAuthenticated ??
              (() => {
                void navigate(from, { replace: true });
              })
            }
          />
        </div>
      </section>
      <aside className="bg-brand relative hidden overflow-hidden lg:block" aria-hidden>
        <div className="bg-hero absolute inset-0 opacity-80" />
        <div className="text-brand-foreground relative flex h-full flex-col justify-end p-12">
          <p className="max-w-md text-3xl font-semibold">Поступления и платежи — на одном горизонте.</p>
          <p className="text-md mt-4 max-w-md opacity-80">
            Прогноз остатка на 30 дней по истории и известным планам. Вероятность риска доступна при
            достаточной истории.
          </p>
        </div>
      </aside>
    </main>
  );
}

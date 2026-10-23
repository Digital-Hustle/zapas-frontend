import { useLocation, useNavigate } from "react-router";
import { LoginByCode } from "@/features/login-by-code";
import { Logo } from "@/shared/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const from =
    (useLocation().state as { from?: string } | null)?.from ?? "/app";
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <LoginByCode
            onSuccess={(isNew) =>
              void navigate(isNew ? "/app/onboarding" : from, { replace: true })
            }
          />
        </div>
      </section>
      <aside
        className="relative hidden overflow-hidden bg-brand lg:block"
        aria-hidden
      >
        <div className="absolute inset-0 bg-hero opacity-80" />
        <div className="relative flex h-full flex-col justify-end p-12 text-brand-foreground">
          <p className="max-w-md text-3xl font-semibold">
            «Денег хватит до 14 ноября». Один ответ вместо таблиц.
          </p>
          <p className="mt-4 max-w-md text-md opacity-80">
            Прогноз остатка на 90 дней, предупреждение о разрыве за недели и
            понятные шаги, как его избежать.
          </p>
        </div>
      </aside>
    </main>
  );
}

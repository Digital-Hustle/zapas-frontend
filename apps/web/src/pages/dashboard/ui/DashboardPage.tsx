import { Skeleton } from "@zapas/ui";
import { useSession } from "@/entities/session";
import { Logo } from "@/shared/ui";

// F1: FR-UI-01/02 — карточка статуса, ForecastChart, предупреждения, ближайшие платежи.
export function DashboardPage() {
  const { data } = useSession();
  const company = data?.companies[0]?.company;
  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-6 py-8">
      <Logo to="/app" />
      <h1 className="text-2xl font-semibold">
        {company?.name ?? "Добро пожаловать"}
      </h1>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

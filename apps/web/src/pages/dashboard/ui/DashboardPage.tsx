import { Link } from "react-router";
import { buttonVariants } from "@zapas/ui";
import { useProfile } from "@/entities/auth-profile";
import { Logo } from "@/shared/ui";

export function DashboardPage() {
  const { data } = useProfile();
  return (
    <main className="max-w-content mx-auto flex flex-col gap-6 px-6 py-8">
      <Logo to="/app" />
      <h1 className="text-2xl font-semibold">
        {data?.displayName ? `Здравствуйте, ${data.displayName}` : "Добро пожаловать"}
      </h1>
      <p className="text-muted-foreground">
        Данные организаций пока недоступны. Профиль и сессии доступны отдельно.
      </p>
      <Link to="/app/profile" className={buttonVariants({ variant: "secondary", className: "w-fit" })}>
        Профиль и сессии
      </Link>
    </main>
  );
}

import { Link, useLocation, useParams, useSearchParams } from "react-router";
import { buttonVariants } from "@zapas/ui";
import { ArrowLeft } from "@zapas/ui/icons";
import { companyPath, scopeId } from "@/shared/lib/workspace-path.ts";
import { ThemeControl } from "../ui/ThemeControl.tsx";

export function PageNavigation() {
  const location = useLocation();
  const [params] = useSearchParams();
  const route = useParams();
  const companyId = scopeId(route.companyId) ?? scopeId(params.get("company"));
  const companyPage = location.pathname.startsWith("/app/company/");
  const back = companyPage
    ? { to: "/app", label: "Назад к организациям" }
    : companyId
      ? { to: companyPath(companyId, scopeId(params.get("account"))), label: "Назад к бизнесу" }
      : location.pathname.startsWith("/app/")
        ? { to: "/app", label: "Назад к организациям" }
        : { to: "/", label: "Назад на главную" };
  return (
    <div className="border-border bg-background border-b">
      <div className="max-w-content mx-auto flex items-center justify-between gap-3 px-6 py-2">
        {location.pathname !== "/" ? (
          <Link to={back.to} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft aria-hidden className="size-4" />
            {back.label}
          </Link>
        ) : (
          <span className="text-muted-foreground text-sm">Прогноз денег для бизнеса</span>
        )}
        <ThemeControl />
      </div>
    </div>
  );
}

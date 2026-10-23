import { Navigate, Outlet, useLocation } from "react-router";
import { Skeleton } from "@zapas/ui";
import { useSession } from "@/entities/session";

export function RequireAuth() {
  const { isPending, isError } = useSession();
  const location = useLocation();
  if (isPending) {
    return (
      <div className="mx-auto flex max-w-content flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }
  if (isError)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

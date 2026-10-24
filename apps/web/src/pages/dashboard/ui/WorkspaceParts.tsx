import type { ReactNode } from "react";
import { Button, ErrorState, Skeleton } from "@zapas/ui";
import type { PageMeta } from "@/entities/workspace";
import { businessIssue } from "@/shared/api/problem.ts";
import { useCountdown } from "@/shared/lib/useCountdown.ts";

export function QueryIssue({
  error,
  saved,
  pending,
  onRetry,
  recovery,
}: {
  error: unknown;
  saved?: boolean;
  pending: boolean;
  onRetry: () => void;
  recovery: ReactNode;
}) {
  const issue = businessIssue(error);
  const left = useCountdown(issue.retryAt ?? null);
  return (
    <div className="space-y-3">
      <ErrorState
        title={
          issue.kind === "forbidden"
            ? "Действие недоступно"
            : issue.kind === "not-found"
              ? "Нет доступа к ресурсу"
              : "Не удалось загрузить данные"
        }
        description={`${issue.message}${saved ? " Показаны сохранённые данные." : ""}`}
        onRetry={
          left > 0 || issue.kind === "refresh-uncertain" || issue.kind === "unauthorized"
            ? undefined
            : onRetry
        }
        retrying={pending}
      />
      {left > 0 && (
        <p role="status" className="text-muted-foreground text-sm">
          Повторить через {left} с
        </p>
      )}
      {(issue.kind === "refresh-uncertain" || issue.kind === "unauthorized") && recovery}
    </div>
  );
}
export function Loading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
export function Pagination({
  page,
  pending,
  onChange,
}: {
  page: PageMeta;
  pending: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending || page.page === 0}
        onClick={() => onChange(page.page - 1)}
      >
        Назад
      </Button>
      <p className="text-muted-foreground text-sm">
        Страница {page.page + 1} · Всего: {page.total}
      </p>
      <Button
        size="sm"
        variant="secondary"
        disabled={pending || !page.hasNext}
        onClick={() => onChange(page.page + 1)}
      >
        Далее
      </Button>
    </div>
  );
}

import { useId, type ReactNode } from "react";
import { CircleAlert, CircleHelp, CircleCheck, Clock, Search } from "../icons.ts";
import { cn } from "../lib/cn.ts";
import { Button } from "./Button.tsx";

export type StatusTone = "neutral" | "success" | "warning" | "danger";
const tones: Record<StatusTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success-soft text-success-soft-foreground",
  warning: "bg-warning-soft text-warning-soft-foreground",
  danger: "bg-danger-soft text-danger-soft-foreground",
};
const icons = { neutral: CircleHelp, success: CircleCheck, warning: Clock, danger: CircleAlert };

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  const Icon = icons[tone];
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}
export function StatusDot({ label, tone = "neutral" }: { label: string; tone?: StatusTone }) {
  return <Badge tone={tone}>{label}</Badge>;
}
/** Severity is supplied by the domain mapper. This component never estimates risk. */
export function RiskBadge({
  level,
  label,
}: {
  level: "low" | "medium" | "high" | "unknown";
  label?: string;
}) {
  const values = {
    low: ["success", "Низкий риск"],
    medium: ["warning", "Средний риск"],
    high: ["danger", "Высокий риск"],
    unknown: ["neutral", "Риск не оценён"],
  } as const;
  return <Badge tone={values[level][0]}>{label ?? values[level][1]}</Badge>;
}

export function EmptyState({
  title,
  description,
  action,
  filtered = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  filtered?: boolean;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="border-border flex flex-col items-center gap-3 rounded-lg border p-6 text-center"
    >
      {filtered ? (
        <Search aria-hidden className="text-muted-foreground size-8" />
      ) : (
        <CircleHelp aria-hidden className="text-muted-foreground size-8" />
      )}
      <h3 id={id} className="text-lg font-semibold">
        {title}
      </h3>
      {description && <p className="text-muted-foreground max-w-md text-sm">{description}</p>}
      {action}
    </section>
  );
}
export function ErrorState({
  title = "Не удалось загрузить данные",
  description,
  traceId,
  onRetry,
  retrying,
  offline = false,
}: {
  title?: string;
  description?: string;
  traceId?: string;
  onRetry?: () => void;
  retrying?: boolean;
  offline?: boolean;
}) {
  return (
    <div
      role="alert"
      className="border-danger bg-danger-soft text-danger-soft-foreground flex flex-col items-start gap-3 rounded-lg border p-5"
    >
      <CircleAlert aria-hidden className="size-6" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="text-sm">{description}</p>}
      {offline && <p className="text-sm">Нет соединения. Сохранённые данные остаются доступными.</p>}
      {traceId && <p className="text-sm break-all">Код обращения: {traceId}</p>}
      {onRetry && (
        <Button variant="secondary" disabled={offline} loading={retrying} onClick={onRetry}>
          Повторить
        </Button>
      )}
    </div>
  );
}

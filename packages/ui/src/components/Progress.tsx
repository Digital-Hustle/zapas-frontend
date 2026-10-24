import { Progress as P } from "radix-ui";
import { Check } from "../icons.ts";
import { cn } from "../lib/cn.ts";

export function Progress({ value, label }: { value: number | null; label: string }) {
  const safe = value !== null && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm">
        {label}
        {safe !== null ? `: ${safe}%` : ": ожидается"}
      </span>
      <P.Root value={safe} max={100} aria-label={label} className="bg-muted h-2 overflow-hidden rounded-full">
        <P.Indicator
          className="bg-primary duration-base h-full rounded-full transition-all motion-reduce:transition-none"
          style={{ width: safe === null ? "0%" : `${safe}%` }}
        />
      </P.Root>
    </div>
  );
}

export interface Step {
  id: string;
  label: string;
  description?: string;
}
export function Stepper({
  steps,
  currentId,
  label = "Этапы",
}: {
  steps: readonly Step[];
  currentId: string;
  label?: string;
}) {
  const current = steps.findIndex((s) => s.id === currentId);
  return (
    <ol aria-label={label} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
      {steps.map((step, i) => (
        <li
          key={step.id}
          aria-current={i === current ? "step" : undefined}
          className="flex min-w-0 items-start gap-3"
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              i <= current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {i < current ? (
              <>
                <Check aria-hidden className="size-4" />
                <span className="sr-only">Завершено</span>
              </>
            ) : (
              i + 1
            )}
          </span>
          <div>
            <p className="font-medium">{step.label}</p>
            {step.description && <p className="text-muted-foreground text-sm">{step.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

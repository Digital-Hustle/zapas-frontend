import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Tabs as R } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@zapas/tokens/motion";
import { cn } from "../lib/cn.ts";

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}
export interface TabsProps extends Omit<
  ComponentPropsWithoutRef<typeof R.Root>,
  "value" | "defaultValue" | "children" | "asChild" | "orientation"
> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  items: readonly TabItem[];
}
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { label, value, items, className, ...props },
  ref,
) {
  const indicatorId = useId();
  const reduced = useReducedMotion();
  return (
    <R.Root {...props} ref={ref} value={value} orientation="horizontal" className={cn("min-w-0", className)}>
      <R.List aria-label={label} className="bg-muted flex flex-wrap gap-1 rounded-lg p-1">
        {items.map((item) => (
          <R.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              "min-h-control-md min-w-control-md focus-visible:ring-ring relative flex-1 rounded-md px-3 py-2 text-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
              value === item.value ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {value === item.value && (
              <motion.span
                aria-hidden
                layoutId={reduced ? undefined : indicatorId}
                transition={spring.snappy}
                className="bg-card absolute inset-0 rounded-md shadow-xs"
              />
            )}
            <span className="relative">{item.label}</span>
          </R.Trigger>
        ))}
      </R.List>
      {items.map((item) => (
        <R.Content
          key={item.value}
          value={item.value}
          className="focus-visible:ring-ring mt-4 rounded-md outline-none focus-visible:ring-2"
        >
          {item.content}
        </R.Content>
      ))}
    </R.Root>
  );
});

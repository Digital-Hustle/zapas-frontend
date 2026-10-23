import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Switch as S } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@zapas/tokens/motion";
import { cn } from "../lib/cn.ts";

export interface SwitchProps extends Omit<
  ComponentPropsWithoutRef<typeof S.Root>,
  "checked" | "defaultChecked" | "children" | "asChild"
> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, className, ...props },
  ref,
) {
  const reduced = useReducedMotion();
  return (
    <S.Root
      ref={ref}
      checked={checked}
      className={cn(
        "size-control-md focus-visible:ring-ring inline-flex shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "duration-fast flex h-6 w-10 items-center rounded-full p-1 transition-colors",
          checked ? "bg-primary justify-end" : "bg-muted justify-start",
        )}
      >
        <S.Thumb asChild>
          <motion.span
            layout={reduced ? false : "position"}
            transition={spring.snappy}
            className={cn(
              "size-4 rounded-full shadow-xs",
              checked ? "bg-primary-foreground" : "bg-muted-foreground",
            )}
          />
        </S.Thumb>
      </span>
    </S.Root>
  );
});

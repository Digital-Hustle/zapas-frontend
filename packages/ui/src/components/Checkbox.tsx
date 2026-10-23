import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Checkbox as C } from "radix-ui";
import { motion } from "motion/react";
import { tween } from "@zapas/tokens/motion";
import { Check } from "../icons.ts";
import { cn } from "../lib/cn.ts";

export type CheckedState = boolean | "indeterminate";
export interface CheckboxProps extends Omit<
  ComponentPropsWithoutRef<typeof C.Root>,
  "checked" | "defaultChecked" | "onCheckedChange" | "children" | "asChild"
> {
  checked: CheckedState;
  onCheckedChange: (checked: CheckedState) => void;
  invalid?: boolean;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { checked, invalid, className, ...props },
  ref,
) {
  return (
    <C.Root
      ref={ref}
      checked={checked}
      aria-invalid={invalid || undefined}
      className={cn(
        "size-control-md focus-visible:ring-ring inline-flex shrink-0 items-center justify-center rounded-sm outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "duration-fast flex size-5 items-center justify-center rounded-xs border transition-colors",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-card",
          invalid && "border-danger",
        )}
      >
        <C.Indicator forceMount asChild>
          <motion.span
            animate={{ opacity: checked ? 1 : 0 }}
            initial={false}
            transition={tween.fast}
            className="flex items-center justify-center"
          >
            {checked === "indeterminate" ? (
              <span className="h-0.5 w-3 rounded-full bg-current" />
            ) : (
              <Check className="size-4" />
            )}
          </motion.span>
        </C.Indicator>
      </span>
    </C.Root>
  );
});

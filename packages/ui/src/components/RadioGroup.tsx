import { forwardRef, useId, type ComponentPropsWithoutRef, type Ref } from "react";
import { RadioGroup as R } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import { spring, tween } from "@zapas/tokens/motion";
import { cn } from "../lib/cn.ts";

export interface ChoiceOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface RadioGroupProps extends Omit<
  ComponentPropsWithoutRef<typeof R.Root>,
  "value" | "defaultValue" | "children" | "asChild"
> {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly ChoiceOption[];
}

function ChoiceGroup({
  label,
  value,
  options,
  className,
  segmented = false,
  groupRef,
  orientation = segmented ? "horizontal" : "vertical",
  ...props
}: RadioGroupProps & { segmented?: boolean; groupRef: Ref<HTMLDivElement> }) {
  const indicatorId = useId();
  const reduced = useReducedMotion();
  return (
    <R.Root
      ref={groupRef}
      value={value}
      aria-label={label}
      orientation={orientation}
      className={cn(
        "flex min-w-0 gap-1",
        segmented
          ? "bg-muted w-fit flex-wrap rounded-lg p-1"
          : orientation === "vertical"
            ? "flex-col"
            : "flex-wrap",
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <R.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            "min-h-control-md min-w-control-md duration-fast focus-visible:ring-ring relative flex items-center gap-3 rounded-md px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
            segmented ? "flex-1 justify-center" : "hover:bg-muted",
            option.value === value ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {segmented ? (
            <R.Indicator asChild>
              <motion.span
                layoutId={reduced ? undefined : indicatorId}
                transition={spring.snappy}
                className="bg-card absolute inset-0 rounded-md shadow-xs"
              />
            </R.Indicator>
          ) : (
            <span
              aria-hidden
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                option.value === value ? "border-primary" : "border-border-strong",
              )}
            >
              <R.Indicator asChild>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={tween.fast}
                  className="bg-primary size-2.5 rounded-full"
                />
              </R.Indicator>
            </span>
          )}
          <span className="relative">{option.label}</span>
        </R.Item>
      ))}
    </R.Root>
  );
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(props, ref) {
  return <ChoiceGroup {...props} groupRef={ref} />;
});
export const Segmented = forwardRef<HTMLDivElement, RadioGroupProps>(function Segmented(props, ref) {
  return <ChoiceGroup {...props} groupRef={ref} segmented />;
});

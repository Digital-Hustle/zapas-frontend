import { forwardRef, type ComponentPropsWithoutRef, type Ref } from "react";
import { Slider as R } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import { press } from "@zapas/tokens/motion";
import { cn } from "../lib/cn.ts";

interface CommonProps extends Omit<
  ComponentPropsWithoutRef<typeof R.Root>,
  "value" | "defaultValue" | "onValueChange" | "onValueCommit" | "children" | "asChild" | "orientation"
> {
  label: string;
  formatValue?: (value: number) => string;
}
export interface SliderProps extends CommonProps {
  value: number;
  onValueChange: (value: number) => void;
  onValueCommit?: (value: number) => void;
}
export interface RangeSliderProps extends CommonProps {
  value: readonly [number, number];
  thumbLabels: readonly [string, string];
  onValueChange: (value: [number, number]) => void;
  onValueCommit?: (value: [number, number]) => void;
}

function SliderBase({
  label,
  value,
  labels,
  formatValue,
  className,
  disabled,
  thumbRef,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  ...props
}: CommonProps & {
  value: number[];
  labels: readonly string[];
  thumbRef: Ref<HTMLSpanElement>;
  onValueChange: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <R.Root
      {...props}
      role="group"
      aria-label={label}
      value={value}
      disabled={disabled}
      orientation="horizontal"
      className={cn(
        "h-control-md relative flex w-full touch-none items-center select-none",
        disabled && "opacity-50",
        className,
      )}
    >
      <R.Track className="bg-muted relative h-1.5 w-full rounded-full">
        <R.Range className="bg-primary absolute h-full rounded-full" />
      </R.Track>
      {labels.map((name, index) => (
        <R.Thumb
          key={index}
          ref={index === 0 ? thumbRef : undefined}
          aria-label={name}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          aria-valuetext={value[index] === undefined ? undefined : formatValue?.(value[index])}
          className="size-control-md focus-visible:ring-ring flex items-center justify-center rounded-full outline-none focus-visible:ring-2"
        >
          <motion.span
            aria-hidden
            tabIndex={-1}
            {...(reduced || disabled ? {} : press)}
            className="border-primary bg-card size-5 rounded-full border-2 shadow-sm"
          />
        </R.Thumb>
      ))}
    </R.Root>
  );
}

export const Slider = forwardRef<HTMLSpanElement, SliderProps>(function Slider(
  { value, label, onValueChange, onValueCommit, ...props },
  ref,
) {
  const emit = (values: number[], callback?: (value: number) => void) => {
    if (values[0] !== undefined) callback?.(values[0]);
  };
  return (
    <SliderBase
      {...props}
      label={label}
      labels={[label]}
      value={[value]}
      thumbRef={ref}
      onValueChange={(values) => emit(values, onValueChange)}
      onValueCommit={(values) => emit(values, onValueCommit)}
    />
  );
});

export const RangeSlider = forwardRef<HTMLSpanElement, RangeSliderProps>(function RangeSlider(
  { value, thumbLabels, onValueChange, onValueCommit, ...props },
  ref,
) {
  const emit = (values: number[], callback?: (value: [number, number]) => void) => {
    if (values[0] !== undefined && values[1] !== undefined) callback?.([values[0], values[1]]);
  };
  return (
    <SliderBase
      {...props}
      labels={thumbLabels}
      preserveThumbOrder
      value={[...value]}
      thumbRef={ref}
      onValueChange={(values) => emit(values, onValueChange)}
      onValueCommit={(values) => emit(values, onValueCommit)}
    />
  );
});

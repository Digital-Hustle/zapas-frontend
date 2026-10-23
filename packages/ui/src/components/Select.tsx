import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Select as S } from "radix-ui";
import { popIn, tween } from "@zapas/tokens/motion";
import { Check, ChevronDown } from "../icons.ts";
import { cn } from "../lib/cn.ts";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Pick<
  ComponentPropsWithoutRef<typeof S.Trigger>,
  "id" | "aria-label" | "aria-labelledby" | "aria-describedby" | "onBlur" | "className"
> {
  value?: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    value,
    onValueChange,
    options,
    placeholder = "Выберите значение",
    name,
    required,
    disabled,
    loading,
    invalid,
    className,
    ...props
  },
  ref,
) {
  const reduced = useReducedMotion();
  const empty = options.length === 0;
  const unavailable = disabled || loading || empty;
  return (
    <S.Root
      value={value ?? ""}
      onValueChange={onValueChange}
      name={name}
      required={required}
      disabled={unavailable}
    >
      <S.Trigger
        ref={ref}
        aria-invalid={invalid || undefined}
        aria-busy={loading || undefined}
        className={cn(
          "h-control-md bg-card duration-fast focus-visible:border-ring focus-visible:shadow-glow data-placeholder:text-muted-foreground flex w-full items-center justify-between gap-2 rounded-md border px-3 text-base transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-danger" : "border-input",
          className,
        )}
        {...props}
      >
        {loading ? "Загрузка…" : empty ? "Нет вариантов" : <S.Value placeholder={placeholder} />}
        <S.Icon asChild>
          <ChevronDown className="text-muted-foreground size-4 shrink-0" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" asChild>
          <motion.div
            initial="hidden"
            animate="show"
            variants={
              reduced ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: tween.fast } } : popIn
            }
            style={{
              transformOrigin: "var(--radix-select-content-transform-origin)",
              minWidth: "var(--radix-select-trigger-width)",
              maxHeight: "var(--radix-select-content-available-height)",
            }}
            className="z-popover border-border bg-popover text-popover-foreground shadow-pop overflow-hidden rounded-lg border"
          >
            <S.ScrollUpButton className="h-control-sm flex items-center justify-center">
              <ChevronDown aria-hidden className="size-4 rotate-180" />
            </S.ScrollUpButton>
            <S.Viewport className="p-1">
              {options.map((option) => (
                <S.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="min-h-control-md data-highlighted:bg-primary-soft data-highlighted:text-primary-soft-foreground flex cursor-default items-center gap-2 rounded-sm px-3 text-base outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  <S.ItemText>{option.label}</S.ItemText>
                  <S.ItemIndicator className="ml-auto">
                    <Check aria-hidden className="size-4" />
                  </S.ItemIndicator>
                </S.Item>
              ))}
            </S.Viewport>
            <S.ScrollDownButton className="h-control-sm flex items-center justify-center">
              <ChevronDown aria-hidden className="size-4" />
            </S.ScrollDownButton>
          </motion.div>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
});

import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Popover } from "radix-ui";
import { DayPicker, type Matcher } from "react-day-picker";
import { ru } from "react-day-picker/locale";
import { format } from "date-fns";
import { popIn, tween } from "@zapas/tokens/motion";
import { CalendarDays } from "../icons.ts";
import { cn } from "../lib/cn.ts";
import { parseCalendarDate, serializeCalendarDate } from "../lib/calendar-date.ts";
import { calendarStyles } from "./calendar-styles.ts";
import { Button } from "./Button.tsx";

export interface DatePickerProps extends Pick<
  ComponentPropsWithoutRef<"button">,
  "id" | "aria-label" | "aria-labelledby" | "aria-describedby" | "onBlur" | "className"
> {
  /** Календарная дата YYYY-MM-DD, без времени и UTC. */
  value?: string;
  onValueChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  disabledDates?: Matcher | Matcher[];
}

export const DatePicker = forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
  {
    value,
    onValueChange,
    placeholder = "Выберите дату",
    disabled,
    required = false,
    invalid,
    disabledDates,
    className,
    ...props
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  const selected = parseCalendarDate(value);
  const hasError = invalid || Boolean(value && !selected);
  const change = (date: Date | undefined) => {
    onValueChange(date ? serializeCalendarDate(date) : undefined);
    setOpen(false);
  };
  return (
    <Popover.Root open={open && !disabled} onOpenChange={setOpen}>
      <Popover.Trigger
        ref={ref}
        type="button"
        disabled={disabled}
        aria-invalid={hasError || undefined}
        className={cn(
          "h-control-md bg-card duration-fast focus-visible:border-ring focus-visible:shadow-glow flex w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-base transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          hasError ? "border-danger" : "border-input",
          !selected && "text-muted-foreground",
          className,
        )}
        {...props}
      >
        {selected ? format(selected, "d MMMM yyyy", { locale: ru }) : placeholder}
        <CalendarDays aria-hidden className="text-muted-foreground size-4 shrink-0" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" aria-label="Выбор даты" asChild>
          <motion.div
            initial="hidden"
            animate="show"
            variants={
              reduced ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: tween.fast } } : popIn
            }
            style={{
              transformOrigin: "var(--radix-popover-content-transform-origin)",
              maxHeight: "var(--radix-popover-content-available-height)",
            }}
            className="z-popover border-border bg-popover text-popover-foreground shadow-pop overflow-auto rounded-lg border p-2"
          >
            <DayPicker
              mode="single"
              locale={ru}
              selected={selected}
              defaultMonth={selected}
              onSelect={change}
              required={required}
              disabled={disabledDates}
              autoFocus
              labels={{ labelPrevious: () => "Предыдущий месяц", labelNext: () => "Следующий месяц" }}
              classNames={calendarStyles}
            />
            {!required && selected && (
              <Button variant="ghost" block onClick={() => change(undefined)}>
                Очистить дату
              </Button>
            )}
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
});

import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import { ru } from "react-day-picker/locale";
import { addDays, endOfQuarter, format, startOfQuarter } from "date-fns";
import { Popover as P } from "radix-ui";
import { CalendarDays } from "../icons.ts";
import { parseCalendarDate, serializeCalendarDate } from "../lib/calendar-date.ts";
import { cn } from "../lib/cn.ts";
import { calendarStyles } from "./calendar-styles.ts";
import { Button } from "./Button.tsx";

export interface CalendarRange {
  from: string;
  to: string;
}
export interface DateRangePickerProps extends Pick<
  ComponentPropsWithoutRef<"button">,
  "id" | "aria-label" | "aria-labelledby" | "aria-describedby" | "onBlur"
> {
  value?: CalendarRange;
  onValueChange: (value: CalendarRange | undefined) => void;
  disabled?: boolean;
  invalid?: boolean;
  required?: boolean;
  disabledDates?: Matcher | Matcher[];
  /** Business-local current date; avoids dependence on the viewer's timezone for presets. */
  today?: string;
}
function dates(value?: CalendarRange): DateRange | undefined {
  const from = parseCalendarDate(value?.from),
    to = parseCalendarDate(value?.to);
  return from && to && from <= to ? { from, to } : undefined;
}
export const DateRangePicker = forwardRef<HTMLButtonElement, DateRangePickerProps>(function DateRangePicker(
  { value, onValueChange, disabled, invalid, required, disabledDates, today, ...props },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(dates(value));
  const selected = dates(value);
  const current = parseCalendarDate(today) ?? new Date();
  const choose = (range: DateRange | undefined) => {
    if (range?.from && range.to) {
      onValueChange({ from: serializeCalendarDate(range.from), to: serializeCalendarDate(range.to) });
      setOpen(false);
    } else setDraft(range);
  };
  return (
    <P.Root
      open={open && !disabled}
      onOpenChange={(next) => {
        setDraft(undefined);
        setOpen(next);
      }}
    >
      <P.Trigger
        type="button"
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || Boolean(value && !selected) || undefined}
        className={cn(
          "h-control-md border-input bg-card duration-fast focus-visible:border-ring focus-visible:shadow-glow flex w-full items-center justify-between gap-2 rounded-md border px-3 text-left text-base transition-colors outline-none disabled:opacity-50",
          invalid && "border-danger",
        )}
        {...props}
      >
        <span className="truncate">
          {selected?.from && selected.to
            ? `${format(selected.from, "dd.MM.yyyy")} — ${format(selected.to, "dd.MM.yyyy")}`
            : "Выберите период"}
        </span>
        <CalendarDays aria-hidden className="size-4 shrink-0" />
      </P.Trigger>
      <P.Portal>
        <P.Content
          aria-label="Выбор периода"
          align="start"
          sideOffset={6}
          className="zapas-popup z-popover border-border bg-popover text-popover-foreground shadow-pop overflow-auto rounded-lg border p-2"
          style={{
            maxHeight: "var(--radix-popover-content-available-height)",
            maxWidth: "var(--radix-popover-content-available-width)",
          }}
        >
          <div className="border-border flex gap-2 border-b pb-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={Boolean(disabledDates)}
              onClick={() => choose({ from: addDays(current, -29), to: current })}
            >
              30 дней
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={Boolean(disabledDates)}
              onClick={() => choose({ from: startOfQuarter(current), to: endOfQuarter(current) })}
            >
              Квартал
            </Button>
          </div>
          <p role="status" className="text-muted-foreground px-2 py-2 text-sm">
            {draft?.from && !draft.to ? "Выберите конец периода" : "Выберите начало периода"}
          </p>
          <DayPicker
            mode="range"
            locale={ru}
            selected={draft}
            defaultMonth={selected?.from ?? current}
            disabled={disabledDates}
            autoFocus
            excludeDisabled
            classNames={calendarStyles}
            labels={{ labelPrevious: () => "Предыдущий месяц", labelNext: () => "Следующий месяц" }}
            onSelect={(_range, day) => {
              if (!draft?.from || draft.to) setDraft({ from: day, to: undefined });
              else choose(_range);
            }}
          />
          {!required && value && (
            <Button
              variant="ghost"
              block
              onClick={() => {
                onValueChange(undefined);
                setOpen(false);
              }}
            >
              Очистить период
            </Button>
          )}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
});

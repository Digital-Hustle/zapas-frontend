import { format, isValid, parse } from "date-fns";

/** Дата бизнеса не является UTC timestamp: проверяем и форматируем локальные части. */
export function parseCalendarDate(value?: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parse(value, "yyyy-MM-dd", new Date());
  if (!isValid(date) || format(date, "yyyy-MM-dd") !== value) return undefined;
  date.setHours(12, 0, 0, 0);
  return date;
}

export function serializeCalendarDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

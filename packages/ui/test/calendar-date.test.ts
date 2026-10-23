import { describe, expect, it } from "vitest";
import { parseCalendarDate, serializeCalendarDate } from "../src/lib/calendar-date.ts";

describe("календарная дата", () => {
  it.each(["2028-02-29", "2026-12-31", "2027-01-01", "2026-03-08", "2026-11-01"])(
    "сохраняет день %s в локальном часовом поясе",
    (value) => {
      const date = parseCalendarDate(value);
      expect(date).toBeInstanceOf(Date);
      if (!date) throw new Error("Дата должна быть корректной");
      expect(serializeCalendarDate(date)).toBe(value);
    },
  );
  it.each([undefined, "", "2026-02-29", "2026-04-31", "2026-13-01", "2026-1-01", "2026-12-31T00:00:00Z"])(
    "отклоняет некорректную дату %s",
    (value) => {
      expect(parseCalendarDate(value)).toBeUndefined();
    },
  );
});

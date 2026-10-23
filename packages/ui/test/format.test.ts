import { describe, expect, it } from "vitest";
import {
  formatMoney,
  formatMoneyCompact,
  parseMoneyInput,
  plural,
} from "../src/lib/format.ts";

const nbsp = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("format", () => {
  it("форматирует деньги из строки", () => {
    expect(nbsp(formatMoney("125000.00"))).toBe("125 000 ₽");
    expect(nbsp(formatMoney("-500.00"))).toBe("−500 ₽");
    expect(nbsp(formatMoney("1500.00", { signed: true }))).toBe("+1 500 ₽");
  });

  it("компактный формат", () => {
    expect(nbsp(formatMoneyCompact("184000.00"))).toBe("184 тыс. ₽");
  });

  it("парсит ввод суммы", () => {
    expect(parseMoneyInput("125 000,5")).toBe("125000.50");
    expect(parseMoneyInput("300000")).toBe("300000.00");
    expect(parseMoneyInput("12,345")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
  });

  it("склоняет", () => {
    const f = ["день", "дня", "дней"] as const;
    expect(plural(1, f)).toBe("день");
    expect(plural(3, f)).toBe("дня");
    expect(plural(11, f)).toBe("дней");
    expect(plural(21, f)).toBe("день");
  });
});

import { describe, expect, it } from "vitest";
import { formatMoney, formatMoneyCompact, parseMoneyInput, plural } from "../src/lib/format.ts";

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

  it("сохраняет точные копейки и округляет большие строки без Number", () => {
    expect(nbsp(formatMoney("99999999999999999.99", { kopecks: true }))).toBe("99 999 999 999 999 999,99 ₽");
    expect(nbsp(formatMoney("99999999999999999.99"))).toBe("100 000 000 000 000 000 ₽");
    expect(nbsp(formatMoney("-0.01", { kopecks: true }))).toBe("−0,01 ₽");
    expect(nbsp(formatMoney("-0.00", { signed: true }))).toBe("0 ₽");
    expect(nbsp(formatMoneyCompact("999950.00"))).toBe("1 млн ₽");
    expect(formatMoney("NaN")).toBe("Нет данных");
  });

  it("парсит ввод суммы", () => {
    expect(parseMoneyInput("125 000,5")).toBe("125000.50");
    expect(parseMoneyInput("300000")).toBe("300000.00");
    expect(parseMoneyInput("12,345")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
    expect(parseMoneyInput("99 999 999 999 999 999,99")).toBe("99999999999999999.99");
    expect(parseMoneyInput("100000000000000000.00")).toBeNull();
    expect(parseMoneyInput("-100.00")).toBeNull();
    expect(parseMoneyInput("−100,50", { allowNegative: true })).toBe("-100.50");
  });

  it("склоняет", () => {
    const f = ["день", "дня", "дней"] as const;
    expect(plural(1, f)).toBe("день");
    expect(plural(3, f)).toBe("дня");
    expect(plural(11, f)).toBe("дней");
    expect(plural(21, f)).toBe("день");
  });
});

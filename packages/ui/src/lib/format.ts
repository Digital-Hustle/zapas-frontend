import { format as fmt, isThisYear, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

/** Деньги приходят строкой "125000.00" (ADR-019). Number используется только для отображения. */
const moneyFull = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});
const moneyKopecks = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  minimumFractionDigits: 2,
});
const moneyCompact = new Intl.NumberFormat("ru-RU", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("ru-RU", {
  style: "percent",
  maximumFractionDigits: 0,
});

export type MoneyString = string;

export const toNumber = (value: MoneyString) => Number(value);

export function formatMoney(
  value: MoneyString,
  opts: { kopecks?: boolean; signed?: boolean } = {},
) {
  const n = toNumber(value);
  const s = (opts.kopecks ? moneyKopecks : moneyFull).format(Math.abs(n));
  if (n < 0) return `−${s}`;
  return opts.signed && n > 0 ? `+${s}` : s;
}

/** «125 тыс. ₽», «1,2 млн ₽» */
export function formatMoneyCompact(value: MoneyString) {
  const n = toNumber(value);
  const s = `${moneyCompact.format(Math.abs(n))} ₽`;
  return n < 0 ? `−${s}` : s;
}

/** «от 90 до 210 тыс. ₽» */
export const formatMoneyRange = (low: MoneyString, high: MoneyString) =>
  `от ${formatMoneyCompact(low).replace(" ₽", "")} до ${formatMoneyCompact(high)}`;

export const formatProbability = (p: number) => percent.format(p);

export type DateString = string;

/** «17 ноября», для другого года — «17 ноября 2025» */
export function formatDate(
  value: DateString,
  style: "long" | "short" | "weekday" = "long",
) {
  const d = parseISO(value);
  if (style === "short")
    return fmt(d, "d MMM", { locale: ru }).replace(".", "");
  if (style === "weekday")
    return fmt(d, "EEEEEE, d MMM", { locale: ru }).replace(".", "");
  return fmt(d, isThisYear(d) ? "d MMMM" : "d MMMM yyyy", { locale: ru });
}

export const toIsoDate = (d: Date) => fmt(d, "yyyy-MM-dd");

/** Склонение: plural(5, ["день", "дня", "дней"]) → «дней» */
export function plural(n: number, forms: readonly [string, string, string]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/** Нормализует ввод пользователя «125 000,5» → "125000.50" или null */
export function parseMoneyInput(input: string): MoneyString | null {
  const cleaned = input.replace(/[\s\u00a0₽]/g, "").replace(",", ".");
  if (!/^\d{1,15}(\.\d{0,2})?$/.test(cleaned)) return null;
  const [int, frac = ""] = cleaned.split(".");
  return `${String(Number(int))}.${frac.padEnd(2, "0")}`;
}

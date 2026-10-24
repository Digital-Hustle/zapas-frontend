import { format as fmt, isThisYear, parseISO } from "date-fns";
import { ru } from "date-fns/locale";

/** Money is a decimal string. BigInt keeps every displayed digit intact. */
const integers = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 0 });
export type MoneyString = string;

/** Coordinates/animation only; never use this conversion for financial values. */
export const toNumber = (value: MoneyString) => Number(value);

function decimal(value: string) {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole = "0", fraction = ""] = value.replace(/^-/, "").split(".");
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return { minor, negative: value.startsWith("-") && minor !== 0n };
}

export function formatMoney(value: MoneyString, opts: { kopecks?: boolean; signed?: boolean } = {}) {
  const parsed = decimal(value);
  if (!parsed) return "Нет данных";
  const { minor, negative } = parsed;
  const integer = opts.kopecks ? minor / 100n : (minor + 50n) / 100n;
  const fraction = opts.kopecks ? `,${String(minor % 100n).padStart(2, "0")}` : "";
  const sign = negative ? "−" : opts.signed && minor > 0n ? "+" : "";
  return `${sign}${integers.format(integer)}${fraction} ₽`;
}

/** Compact display is rounded with integers, including unit carry at 999.95. */
export function formatMoneyCompact(value: MoneyString) {
  const parsed = decimal(value);
  if (!parsed) return "Нет данных";
  const units = [
    [1n, ""],
    [1000n, "тыс."],
    [1000000n, "млн"],
    [1000000000n, "млрд"],
    [1000000000000n, "трлн"],
  ] as const;
  let index = 0;
  while (index < units.length - 1 && parsed.minor >= (units[index + 1] ?? units[0])[0] * 100n) index++;
  let unit = units[index] ?? units[0];
  let tenths = (parsed.minor + unit[0] * 5n) / (unit[0] * 10n);
  if (tenths >= 10000n && index < units.length - 1) {
    unit = units[++index] ?? units[0];
    tenths = (parsed.minor + unit[0] * 5n) / (unit[0] * 10n);
  }
  const fraction = tenths % 10n;
  return `${parsed.negative ? "−" : ""}${integers.format(tenths / 10n)}${fraction ? `,${fraction}` : ""}${unit[1] ? ` ${unit[1]}` : ""} ₽`;
}

export const formatMoneyRange = (low: MoneyString, high: MoneyString) =>
  `от ${formatMoneyCompact(low).replace(" ₽", "")} до ${formatMoneyCompact(high)}`;

export const formatProbability = (p: number) => percent.format(p);

export type DateString = string;

/** «17 ноября», для другого года — «17 ноября 2025» */
export function formatDate(value: DateString, style: "long" | "short" | "weekday" = "long") {
  const d = parseISO(value);
  if (style === "short") return fmt(d, "d MMM", { locale: ru }).replace(".", "");
  if (style === "weekday") return fmt(d, "EEEEEE, d MMM", { locale: ru }).replace(".", "");
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
export function parseMoneyInput(
  input: string,
  options: { allowNegative?: boolean } = {},
): MoneyString | null {
  const cleaned = input
    .replace(/[\s\u00a0₽]/g, "")
    .replace(",", ".")
    .replace(/^−/, "-");
  if (!/^-?\d{1,17}(\.\d{0,2})?$/.test(cleaned) || (cleaned.startsWith("-") && !options.allowNegative))
    return null;
  const [int, frac = ""] = cleaned.replace(/^-/, "").split(".");
  const result = `${(int ?? "0").replace(/^0+(?=\d)/, "")}.${frac.padEnd(2, "0")}`;
  return cleaned.startsWith("-") && !/^0\.00$/.test(result) ? `-${result}` : result;
}

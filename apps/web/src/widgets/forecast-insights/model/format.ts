import { formatProbability } from "@zapas/ui";

const grouped = new Intl.NumberFormat("ru-RU");
const decimal = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 });

export function moneyText(value: string | null, empty = "Недостаточно наблюдений") {
  if (value === null || !/^-?\d{1,17}\.\d{2}$/.test(value)) return empty;
  const [integer = "0", fraction] = value.replace(/^-/, "").split(".");
  return `${value.startsWith("-") ? "−" : ""}${grouped.format(BigInt(integer))},${fraction} ₽`;
}

export function probabilityText(value: number | null) {
  return value !== null && Number.isFinite(value) && value >= 0 && value <= 1
    ? formatProbability(value)
    : "Недостаточно наблюдений";
}

export function decimalText(value: number | null, unit = "") {
  return value !== null && Number.isFinite(value)
    ? `${decimal.format(value)}${unit}`
    : "Недостаточно наблюдений";
}

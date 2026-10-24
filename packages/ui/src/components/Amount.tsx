import NumberFlow from "@number-flow/react";
import { useReducedMotion } from "motion/react";
import { formatMoney } from "../lib/format.ts";
import { cn } from "../lib/cn.ts";

export interface AmountProps {
  value: string;
  kopecks?: boolean;
  signed?: boolean;
  className?: string;
  animated?: boolean;
}
/** Animation is presentation only; large values always retain their exact string. */
export function Amount({ value, kopecks = true, signed = false, className, animated = true }: AmountProps) {
  const reduced = useReducedMotion();
  const text = formatMoney(value, { kopecks, signed });
  const valid = /^-?\d+(?:\.\d{1,2})?$/.test(value);
  const minor = valid
    ? BigInt(value.replace(/^-/, "").split(".")[0] ?? "0") * 100n +
      BigInt((value.split(".")[1] ?? "").padEnd(2, "0"))
    : null;
  const canAnimate = animated && !reduced && minor !== null && minor <= BigInt(Number.MAX_SAFE_INTEGER);
  return (
    <span className={cn("tabular-nums", className)}>
      {canAnimate ? (
        <>
          <span className="sr-only">{text}</span>
          <span aria-hidden>
            <NumberFlow
              value={Number(value)}
              locales="ru-RU"
              format={{
                style: "currency",
                currency: "RUB",
                minimumFractionDigits: kopecks ? 2 : 0,
                maximumFractionDigits: kopecks ? 2 : 0,
                signDisplay: signed ? "exceptZero" : "auto",
              }}
            />
          </span>
        </>
      ) : (
        text
      )}
    </span>
  );
}

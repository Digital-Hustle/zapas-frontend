import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { formatMoney, parseMoneyInput, type MoneyString } from "../lib/format.ts";
import { Input } from "./Input.tsx";

const display = (v: MoneyString | null) =>
  v === null || v === "" ? "" : formatMoney(v, { kopecks: true }).replace(/ ₽$/, "");

export interface MoneyInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> {
  /** Строка "125000.00" (ADR-019) или null */
  value: MoneyString | null;
  onChange: (value: MoneyString | null) => void;
  invalid?: boolean;
  allowNegative?: boolean;
}

/** Ввод суммы без type=number: маска «125 000,5 ₽», наружу — строка с двумя знаками. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, invalid, allowNegative = false, onBlur, onFocus, ...props },
  ref,
) {
  const [draft, setDraft] = useState<string | null>(null);
  const invalidDraft =
    draft !== null && draft.trim() !== "" && parseMoneyInput(draft, { allowNegative }) === null;
  return (
    <Input
      ref={ref}
      inputMode="decimal"
      autoComplete="off"
      suffix="₽"
      invalid={invalid || invalidDraft}
      value={draft ?? display(value)}
      onFocus={(event) => {
        setDraft((current) => current ?? display(value));
        onFocus?.(event);
      }}
      onBlur={(event) => {
        if (!invalidDraft) setDraft(null);
        onBlur?.(event);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        onChange(raw.trim() === "" ? null : parseMoneyInput(raw, { allowNegative }));
      }}
      {...props}
    />
  );
});

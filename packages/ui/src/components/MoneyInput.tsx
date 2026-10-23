import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { parseMoneyInput, type MoneyString } from "../lib/format.ts";
import { Input } from "./Input.tsx";

const group = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

const display = (v: MoneyString | null) =>
  v === null || v === "" ? "" : group.format(Number(v));

export interface MoneyInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> {
  /** Строка "125000.00" (ADR-019) или null */
  value: MoneyString | null;
  onChange: (value: MoneyString | null) => void;
  invalid?: boolean;
}

/** Ввод суммы без type=number: маска «125 000,5 ₽», наружу — строка с двумя знаками. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput({ value, onChange, invalid, ...props }, ref) {
    const [draft, setDraft] = useState<string | null>(null);
    return (
      <Input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        suffix="₽"
        invalid={invalid}
        value={draft ?? display(value)}
        onFocus={() => setDraft(display(value))}
        onBlur={() => {
          setDraft(null);
        }}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d,.\s]/g, "");
          setDraft(raw);
          onChange(raw.trim() === "" ? null : parseMoneyInput(raw));
        }}
        {...props}
      />
    );
  },
);

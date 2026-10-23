import { useEffect } from "react";
import { motion, useAnimationControls } from "motion/react";
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";
import { shake, spring } from "@zapas/tokens/motion";
import { cn } from "../lib/cn.ts";

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  /** Увеличивайте при каждой неверной попытке — поле встряхнётся. */
  errorKey?: number;
  disabled?: boolean;
  "aria-label"?: string;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  errorKey = 0,
  disabled,
  ...aria
}: OtpInputProps) {
  const controls = useAnimationControls();
  useEffect(() => {
    if (errorKey > 0) void controls.start(shake);
  }, [errorKey, controls]);

  return (
    <motion.div animate={controls}>
      <OTPInput
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        maxLength={length}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        disabled={disabled}
        aria-label={aria["aria-label"] ?? "Код из письма"}
        containerClassName="flex items-center justify-center gap-2"
        render={({ slots }) => (
          <>
            {slots.map((slot, i) => (
              <Slot
                key={i}
                {...slot}
                error={errorKey > 0 && value.length === 0}
              />
            ))}
          </>
        )}
      />
    </motion.div>
  );
}

function Slot({
  char,
  isActive,
  hasFakeCaret,
  error,
}: SlotProps & { error: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-control-lg w-12 items-center justify-center rounded-md border bg-card text-2xl font-semibold tabular transition-colors duration-fast",
        isActive ? "border-ring shadow-glow" : "border-input",
        error && "border-danger",
      )}
    >
      {char && (
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.snappy}
        >
          {char}
        </motion.span>
      )}
      {hasFakeCaret && (
        <motion.span
          className="absolute h-6 w-px bg-foreground"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ repeat: Infinity, duration: 1.1 }} // zapas-check-ignore: мигание каретки как у системного поля
        />
      )}
    </div>
  );
}

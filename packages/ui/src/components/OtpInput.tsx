import { forwardRef, useEffect, type ComponentPropsWithoutRef } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import { OTPInput, REGEXP_ONLY_DIGITS, type SlotProps } from "input-otp";
import { shake, spring } from "@zapas/tokens/motion";
import { cn } from "../lib/cn.ts";
import { motion as motionTokens } from "@zapas/tokens";

export interface OtpInputProps extends Pick<
  ComponentPropsWithoutRef<typeof OTPInput>,
  "id" | "name" | "onBlur" | "autoFocus" | "aria-label" | "aria-labelledby" | "aria-describedby"
> {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  /** Увеличивайте при каждой неверной попытке — поле встряхнётся. */
  errorKey?: number;
  disabled?: boolean;
  invalid?: boolean;
}

export const OtpInput = forwardRef<HTMLInputElement, OtpInputProps>(function OtpInput(
  { value, onChange, onComplete, length = 6, errorKey = 0, disabled, invalid, ...aria },
  ref,
) {
  const controls = useAnimationControls();
  const reduced = useReducedMotion();
  const hasError = invalid ?? (errorKey > 0 && value.length === 0);
  useEffect(() => {
    if (errorKey > 0 && !reduced) void controls.start(shake);
  }, [errorKey, controls, reduced]);

  return (
    <motion.div animate={controls}>
      <OTPInput
        ref={ref}
        value={value}
        onChange={onChange}
        onComplete={disabled ? undefined : onComplete}
        maxLength={length}
        pattern={REGEXP_ONLY_DIGITS}
        inputMode="numeric"
        autoComplete="one-time-code"
        disabled={disabled}
        {...aria}
        aria-invalid={hasError || undefined}
        aria-label={
          aria["aria-label"] ??
          (aria["aria-labelledby"] !== undefined || aria.id !== undefined ? undefined : "Код из письма")
        }
        containerClassName="flex w-full items-center justify-center gap-2"
        render={({ slots }) => (
          <>
            {slots.map((slot, i) => (
              <Slot key={i} {...slot} error={hasError} />
            ))}
          </>
        )}
      />
    </motion.div>
  );
});

function Slot({ char, isActive, hasFakeCaret, error }: SlotProps & { error: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div
      className={cn(
        "h-control-lg bg-card tabular duration-fast relative flex max-w-12 min-w-0 flex-1 items-center justify-center rounded-md border text-2xl font-semibold transition-colors",
        isActive ? "border-ring shadow-glow" : "border-input",
        error && "border-danger",
      )}
    >
      {char && (
        <motion.span
          initial={reduced ? false : { opacity: 0, y: motionTokens.distance.exit }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.snappy}
        >
          {char}
        </motion.span>
      )}
      {hasFakeCaret && (
        <motion.span
          className="bg-foreground absolute h-6 w-px"
          animate={reduced ? { opacity: 1 } : { opacity: [1, 0, 1] }}
          transition={{ repeat: reduced ? 0 : Infinity, duration: motionTokens.duration.caret }}
        />
      )}
    </div>
  );
}

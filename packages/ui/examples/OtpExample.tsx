import { useState } from "react";
import { Field, OtpInput, ResendCode } from "../src/index.ts";

export function OtpExample() {
  const [value, setValue] = useState("");
  const [completed, setCompleted] = useState(0);
  const [resendAt, setResendAt] = useState<number | null>(() => Date.now() - 1);
  return (
    <section
      aria-label="Код подтверждения"
      className="border-border bg-card flex min-w-0 flex-col gap-4 rounded-xl border p-4 md:p-6"
    >
      <h2 className="text-lg font-semibold">Код подтверждения</h2>
      <p className="text-muted-foreground text-sm">Локальный пример без отправки писем и входа в аккаунт.</p>
      <Field htmlFor="example-code" label="Код для примера">
        <OtpInput
          id="example-code"
          value={value}
          onChange={setValue}
          onComplete={() => setCompleted((count) => count + 1)}
        />
      </Field>
      <p data-testid="otp-result" className="text-sm">
        Кодов для примера принято: {completed}
      </p>
      <ResendCode
        resendAt={resendAt}
        onResend={() => {
          setValue("");
          setResendAt(Date.now() + 30000);
        }}
      />
    </section>
  );
}

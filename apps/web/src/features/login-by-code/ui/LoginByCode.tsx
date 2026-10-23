import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "@zapas/api";
import { Button, Field, Input, OtpInput, plural } from "@zapas/ui";
import { ArrowLeft, Mail } from "@zapas/ui/icons";
import { fadeUp } from "@zapas/tokens/motion";
import {
  useRequestCode,
  useVerifyCode,
  type CodeRs,
} from "../api/mutations.ts";
import { useCountdown } from "../model/useCountdown.ts";

const emailSchema = z.object({
  email: z.email("Проверьте адрес почты").max(254),
});

type Step = { kind: "email" } | { kind: "code"; email: string; sent: CodeRs };

function describeError(e: unknown): string {
  if (!(e instanceof ApiError))
    return "Не удалось проверить код. Повторите попытку.";
  const { code, attemptsLeft, detail } = e.problem;
  if (code === "AUTH_CODE_INVALID" && typeof attemptsLeft === "number") {
    return attemptsLeft > 0
      ? `Неверный код. Осталось ${attemptsLeft} ${plural(attemptsLeft, ["попытка", "попытки", "попыток"])}`
      : "Код больше не действует — запросите новый.";
  }
  return detail;
}

export function LoginByCode({
  onSuccess,
}: {
  onSuccess: (isNewUser: boolean) => void;
}) {
  const [step, setStep] = useState<Step>({ kind: "email" });
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const request = useRequestCode();
  const lockLeft = useCountdown(lockedUntil);

  const send = async (email: string) => {
    try {
      const sent = await request.mutateAsync(email);
      setStep({ kind: "code", email, sent });
      setLockedUntil(null);
      return sent;
    } catch (e) {
      if (e instanceof ApiError && e.problem.retryAfterSec)
        setLockedUntil(Date.now() + e.problem.retryAfterSec * 1000);
      throw e;
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {step.kind === "email" ? (
        <motion.div
          key="email"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <EmailStep
            onSubmit={send}
            pending={request.isPending}
            lockLeft={lockLeft}
            error={request.error}
          />
        </motion.div>
      ) : (
        <motion.div
          key="code"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <CodeStep
            email={step.email}
            sent={step.sent}
            onBack={() => setStep({ kind: "email" })}
            onResend={() => send(step.email)}
            onSuccess={onSuccess}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EmailStep({
  onSubmit,
  pending,
  lockLeft,
  error,
}: {
  onSubmit: (email: string) => Promise<unknown>;
  pending: boolean;
  lockLeft: number;
  error: Error | null;
}) {
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const apiError =
    error instanceof ApiError && lockLeft === 0 ? error.problem.detail : null;
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={form.handleSubmit(({ email }) =>
        onSubmit(email).catch(() => undefined),
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold">Вход в Запас</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Пришлём код на почту. Пароль не нужен.
        </p>
      </div>
      <Field
        label="Рабочая почта"
        htmlFor="email"
        error={form.formState.errors.email?.message ?? apiError ?? undefined}
      >
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="you@company.ru"
          prefix={<Mail />}
          invalid={Boolean(form.formState.errors.email)}
          aria-describedby={
            form.formState.errors.email ? "email-error" : undefined
          }
          {...form.register("email")}
        />
      </Field>
      <Button
        type="submit"
        size="lg"
        block
        loading={pending}
        disabled={lockLeft > 0}
      >
        {lockLeft > 0
          ? `Повторить через ${lockLeft} ${plural(lockLeft, ["секунду", "секунды", "секунд"])}`
          : "Получить код"}
      </Button>
      <p className="text-sm text-muted-foreground">
        Продолжая, вы соглашаетесь с условиями сервиса и обработкой данных.
      </p>
    </form>
  );
}

function CodeStep({
  email,
  sent,
  onBack,
  onResend,
  onSuccess,
}: {
  email: string;
  sent: CodeRs;
  onBack: () => void;
  onResend: () => Promise<CodeRs>;
  onSuccess: (isNew: boolean) => void;
}) {
  const [code, setCode] = useState(sent.demoCode ?? "");
  const [errorKey, setErrorKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(
    () => Date.now() + sent.resendAfterSec * 1000,
  );
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const resendLeft = useCountdown(resendAt);
  const lockLeft = useCountdown(lockedUntil);
  const verify = useVerifyCode();

  const submit = async (value: string) => {
    setMessage(null);
    try {
      const res = await verify.mutateAsync({ email, code: value });
      onSuccess(res.isNewUser);
    } catch (e) {
      setCode("");
      setErrorKey((k) => k + 1);
      setMessage(describeError(e));
      if (
        e instanceof ApiError &&
        e.problem.code === "AUTH_LOCKED" &&
        e.problem.retryAfterSec
      ) {
        setLockedUntil(Date.now() + e.problem.retryAfterSec * 1000);
      }
    }
  };

  const resend = async () => {
    try {
      const next = await onResend();
      setResendAt(Date.now() + next.resendAfterSec * 1000);
      setMessage(null);
    } catch (e) {
      if (e instanceof ApiError && e.problem.retryAfterSec)
        setResendAt(Date.now() + e.problem.retryAfterSec * 1000);
    }
  };

  const locked = lockLeft > 0;
  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex w-fit items-center gap-1 rounded-sm px-2 py-1 text-sm text-muted-foreground transition-colors duration-fast hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Другая почта
      </button>
      <div>
        <h1 className="text-2xl font-semibold">Введите код</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Отправили {sent.codeLength} цифр на{" "}
          <span className="font-medium text-foreground">
            {sent.maskedEmail}
          </span>
          . Код действует {Math.round(sent.expiresInSec / 60)} минут.
        </p>
      </div>
      <OtpInput
        value={code}
        onChange={setCode}
        onComplete={(v) => void submit(v)}
        length={sent.codeLength}
        errorKey={errorKey}
        disabled={verify.isPending || locked}
      />
      <div className="min-h-5 text-center text-sm" aria-live="polite">
        {locked ? (
          <span className="text-danger">
            Слишком много попыток. Вход откроется через{" "}
            {Math.ceil(lockLeft / 60)} мин.
          </span>
        ) : (
          message && <span className="text-danger">{message}</span>
        )}
      </div>
      <Button
        variant="ghost"
        onClick={() => void resend()}
        disabled={resendLeft > 0 || locked}
      >
        {resendLeft > 0
          ? `Отправить снова через ${resendLeft} с`
          : "Отправить код ещё раз"}
      </Button>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { useIsMutating } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Field, Input, OtpInput, notify } from "@zapas/ui";
import { ArrowLeft, Mail } from "@zapas/ui/icons";
import { fadeUp } from "@zapas/tokens/motion";
import { authIssue, emailSchema, otpSchema, useAuthPort, type LoginChallenge } from "@/entities/auth-profile";
import { useRequestCode, useVerifyCode } from "../api/mutations.ts";
import { useCountdown } from "@/shared/lib/useCountdown.ts";

const emailForm = z.object({ email: emailSchema });
const codeForm = z.object({ code: otpSchema });

export function LoginByCode({ onSuccess }: { onSuccess: () => void }) {
  const port = useAuthPort();
  const [step, setStep] = useState<{ email: string; challenge: LoginChallenge } | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const request = useRequestCode();
  const busy = useIsMutating({ mutationKey: ["auth-profile"] }) > 0;
  const lockLeft = useCountdown(lockedUntil);
  const mounted = useRef(false);
  const requesting = useRef(false);
  useEffect(() => {
    requesting.current = false;
  }, [step?.challenge.id]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const send = async (email: string) => {
    if (requesting.current || busy) return;
    requesting.current = true;
    try {
      const challenge = await request.mutateAsync(email);
      if (mounted.current) {
        setStep({ email, challenge });
        setLockedUntil(null);
      }
    } catch (error) {
      requesting.current = false;
      const issue = authIssue(error);
      if (mounted.current) {
        if (issue.retryAt) setLockedUntil(issue.retryAt);
        if (!issue.fields?.email) notify.error(issue.message);
      }
    }
  };

  if (!port)
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Вход в Запас</h1>
        <p role="alert" className="text-muted-foreground">
          Сервис входа пока недоступен.
        </p>
        <p className="text-muted-foreground text-sm">Попробуйте зайти позже. Код не запрашивался.</p>
      </div>
    );

  return (
    <motion.div key={step?.challenge.id ?? "email"} variants={fadeUp} initial="hidden" animate="show">
      {step ? (
        <CodeStep
          email={step.email}
          challenge={step.challenge}
          requestError={request.error}
          resendPending={request.isPending}
          requestLock={lockLeft}
          onBack={() => {
            setStep(null);
            request.reset();
          }}
          onResend={() => send(step.email)}
          onSuccess={() => {
            if (mounted.current) onSuccess();
          }}
        />
      ) : (
        <EmailStep
          onSubmit={send}
          pending={request.isPending || busy}
          lockLeft={lockLeft}
          error={request.error}
        />
      )}
    </motion.div>
  );
}

function EmailStep({
  onSubmit,
  pending,
  lockLeft,
  error,
}: {
  onSubmit: (email: string) => Promise<void>;
  pending: boolean;
  lockLeft: number;
  error: Error | null;
}) {
  const id = useId();
  const form = useForm<z.infer<typeof emailForm>>({
    resolver: zodResolver(emailForm),
    defaultValues: { email: import.meta.env.VITE_PREVIEW_MOCKS === "1" ? "demo@example.test" : "" },
  });
  const issue = error ? authIssue(error) : null;
  const message = form.formState.errors.email?.message ?? issue?.fields?.email;
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={form.handleSubmit(({ email }) => onSubmit(email))}
    >
      <div>
        <h1 className="text-2xl font-semibold">Вход в Запас</h1>
        <p className="text-muted-foreground mt-2">Пришлём код на почту. Пароль не нужен.</p>
      </div>
      <Field label="Рабочая почта" htmlFor={id} error={message}>
        <Input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="you@company.ru"
          prefix={<Mail />}
          invalid={Boolean(message)}
          aria-describedby={message ? `${id}-error` : undefined}
          disabled={pending}
          {...form.register("email")}
        />
      </Field>
      {issue && !issue.fields?.email && (
        <p role="alert" className="text-danger text-sm">
          {issue.message}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        block
        loading={pending}
        disabled={lockLeft > 0 || form.formState.isSubmitting}
      >
        {lockLeft > 0 ? `Повторить через ${lockLeft} с` : "Получить код"}
      </Button>
    </form>
  );
}

function CodeStep({
  email,
  challenge,
  requestError,
  resendPending,
  requestLock,
  onBack,
  onResend,
  onSuccess,
}: {
  email: string;
  challenge: LoginChallenge;
  requestError: Error | null;
  resendPending: boolean;
  requestLock: number;
  onBack: () => void;
  onResend: () => Promise<void>;
  onSuccess: () => void;
}) {
  const id = useId();
  const form = useForm<z.infer<typeof codeForm>>({
    resolver: zodResolver(codeForm),
    defaultValues: { code: "" },
  });
  const [errorKey, setErrorKey] = useState(0);
  const [serverExpired, setServerExpired] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const verifying = useRef(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const verify = useVerifyCode();
  const busy = useIsMutating({ mutationKey: ["auth-profile"] }) > 0;
  const expiryLeft = useCountdown(challenge.expiresAt);
  const resendLeft = useCountdown(challenge.resendAt);
  const lockLeft = useCountdown(lockedUntil);
  const expired = serverExpired || expiryLeft === 0;
  const unusable = expired || exhausted;
  const locked = lockLeft > 0 || requestLock > 0;
  const pending = verify.isPending || resendPending || form.formState.isSubmitting || confirmed || busy;
  const issue = requestError ? authIssue(requestError) : null;
  const submit = async ({ code }: { code: string }) => {
    if (verifying.current || resendPending || unusable || locked || busy) return;
    verifying.current = true;
    try {
      await verify.mutateAsync({ challengeId: challenge.id, code });
      setConfirmed(true);
      onSuccess();
    } catch (error) {
      verifying.current = false;
      const failure = authIssue(error);
      form.setValue("code", "");
      setErrorKey((value) => value + 1);
      form.setError("code", { message: failure.message });
      if (failure.kind === "code-expired") setServerExpired(true);
      if (failure.kind === "code-attempts-exceeded") setExhausted(true);
      if (failure.retryAt) setLockedUntil(failure.retryAt);
      if (failure.kind !== "code-invalid" && failure.kind !== "code-expired") notify.error(failure.message);
    }
  };
  return (
    <form
      className="flex flex-col gap-5"
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(submit)(event);
      }}
    >
      <Button variant="ghost" size="sm" className="w-fit" disabled={pending} onClick={onBack}>
        <ArrowLeft />
        Другая почта
      </Button>
      <div>
        <h1 id={`${id}-title`} className="text-2xl font-semibold">
          Введите код
        </h1>
        <p id={`${id}-hint`} className="text-muted-foreground mt-2">
          {import.meta.env.VITE_PREVIEW_MOCKS === "1" ? (
            <>
              Демокод: <strong>000123</strong>. Письмо не отправляется.{" "}
            </>
          ) : (
            <>
              Отправили шесть цифр на <span className="text-foreground font-medium break-all">{email}</span>
              .{" "}
            </>
          )}
          {unusable ? "Код больше не действует." : `Код действует ещё ${expiryLeft} с.`}
        </p>
      </div>
      <div role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-hint ${id}-error`}>
        <Controller
          control={form.control}
          name="code"
          render={({ field }) => (
            <OtpInput
              value={field.value}
              onChange={field.onChange}
              length={6}
              errorKey={errorKey}
              disabled={pending || unusable || locked}
              aria-label="Код из письма, шесть цифр"
            />
          )}
        />
        <p id={`${id}-error`} className="text-danger mt-3 min-h-5 text-sm" aria-live="polite">
          {exhausted
            ? "Попытки для этого кода закончились — запросите новый."
            : expired
              ? "Код истёк — запросите новый."
              : form.formState.errors.code?.message}
        </p>
      </div>
      {locked && (
        <p role="status" className="text-warning-soft-foreground text-sm">
          Повторить через {Math.max(lockLeft, requestLock)} с.
        </p>
      )}
      {issue && (
        <p role="alert" className="text-danger text-sm">
          {issue.message}
        </p>
      )}
      {/* Второй клик старой кнопки может попасть в новую форму после смены шага. */}
      <Button
        type="submit"
        size="lg"
        block
        loading={verify.isPending}
        disabled={pending || unusable || locked}
        onClick={(event) => {
          if (event.detail > 1) event.preventDefault();
        }}
      >
        Войти
      </Button>
      <Button
        variant="ghost"
        loading={resendPending}
        disabled={pending || resendLeft > 0 || locked}
        onClick={() => void onResend()}
      >
        {resendLeft > 0 ? `Отправить снова через ${resendLeft} с` : "Отправить код ещё раз"}
      </Button>
    </form>
  );
}

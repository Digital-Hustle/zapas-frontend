import { ApiError } from "@zapas/api";
import type { CodeChallengeRs, ProfileRs, SessionsRs } from "@zapas/api/auth-profile";
import { z } from "zod";
import { displayNameSchema, profileVersionSchema } from "../model/schemas.ts";
import type { AuthIssue, AuthProfile, BrowserSession, LoginChallenge } from "../model/types.ts";

const instant = z.iso.datetime();
const profileResponse = z.object({
  id: z.uuid(),
  email: z.email().max(254),
  displayName: displayNameSchema.nullable(),
  version: profileVersionSchema,
  createdAt: instant,
  updatedAt: instant,
});
const challengeResponse = z.object({
  challengeId: z.uuid(),
  expiresAt: instant,
  resendAvailableAt: instant,
  codeLength: z.literal(6),
});
const sessionResponse = z.object({
  id: z.uuid(),
  createdAt: instant,
  lastSeenAt: instant,
  expiresAt: instant,
  current: z.boolean(),
});
const sessionsResponse = z
  .object({ items: z.array(sessionResponse), total: z.number().int().nonnegative() })
  .refine(({ items, total }) => items.length === total);

export function mapProfile(value: ProfileRs): AuthProfile {
  const { id, email, displayName, version } = profileResponse.parse(value);
  return { id, email, displayName, version };
}
export function mapChallenge(value: CodeChallengeRs): LoginChallenge {
  const result = challengeResponse.parse(value);
  return {
    id: result.challengeId,
    expiresAt: Date.parse(result.expiresAt),
    resendAt: Date.parse(result.resendAvailableAt),
  };
}
export function mapSessions(value: SessionsRs): readonly BrowserSession[] {
  return sessionsResponse.parse(value).items;
}

const fields: Readonly<Record<string, string>> = {
  email: "Проверьте адрес почты",
  code: "Введите шесть цифр из письма",
  displayName: "Имя: от 1 до 100 символов, не только пробелы",
};
export function mapAuthFailure(error: unknown, now = Date.now()): AuthIssue {
  if (error instanceof z.ZodError)
    return { kind: "unavailable", message: "Не удалось прочитать ответ сервиса. Попробуйте позже." };
  const unknown: AuthIssue = { kind: "unknown", message: "Сервис временно недоступен. Попробуйте ещё раз." };
  if (!(error instanceof ApiError)) return unknown;
  const seconds = error.problem.retryAfterSec;
  const retryAt =
    seconds !== null && seconds !== undefined && Number.isFinite(seconds) && seconds > 0
      ? now + seconds * 1000
      : undefined;
  switch (error.code) {
    case "CODE_INVALID":
      return { kind: "code-invalid", message: "Неверный код. Проверьте письмо." };
    case "CODE_EXPIRED":
      return { kind: "code-expired", message: "Код истёк — запросите новый." };
    case "CODE_ATTEMPTS_EXCEEDED":
      return {
        kind: "code-attempts-exceeded",
        message: "Попытки для этого кода закончились — запросите новый.",
        retryAt,
      };
    case "REFRESH_INVALID":
    case "REFRESH_REUSED":
      return { kind: "session-expired", message: "Сессия закончилась. Войдите снова." };
  }
  // The shared transport latches uncertain rotations. Reading the profile again cannot recover it.
  // A protected 401 after a successful rotation is not evidence of refresh rejection either.
  if (!error.retryable || error.code === "AUTHENTICATION_REQUIRED")
    return {
      kind: "refresh-uncertain",
      message: "Не удалось подтвердить обновление сессии. Обновите сессию или войдите снова.",
    };
  switch (error.code) {
    case "RATE_LIMITED":
      return { kind: "rate-limit", message: "Слишком много запросов. Повторите позже.", retryAt };
    case "PROFILE_VERSION_CONFLICT":
      return { kind: "profile-conflict", message: "Профиль изменён в другой сессии." };
    case "SESSION_NOT_FOUND":
      return { kind: "session-not-found", message: "Сессия уже отсутствует. Обновите список." };
    case "VALIDATION_ERROR":
      return {
        kind: "validation",
        message: "Проверьте данные формы.",
        fields: Object.fromEntries(
          (error.problem.errors ?? []).flatMap(({ field }) => {
            const message = Object.hasOwn(fields, field) ? fields[field] : undefined;
            return message ? [[field, message]] : [];
          }),
        ),
      };
    case "CSRF_INVALID":
      return { kind: "unavailable", message: "Не удалось подтвердить запрос. Повторите действие." };
  }
  if (error.status === 0) return { kind: "offline", message: "Нет соединения с сервером." };
  if (error.status === 502 || error.status === 503 || error.status === 504)
    return { kind: "unavailable", message: "Сервис временно недоступен. Попробуйте позже." };
  return unknown;
}

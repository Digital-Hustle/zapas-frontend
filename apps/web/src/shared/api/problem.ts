import { ApiError } from "@zapas/api";
import { z } from "zod";

export interface BusinessIssue {
  kind:
    | "offline"
    | "unavailable"
    | "refresh-uncertain"
    | "unauthorized"
    | "forbidden"
    | "not-found"
    | "conflict"
    | "version-conflict"
    | "validation"
    | "rate-limit"
    | "unknown";
  message: string;
  ambiguous: boolean;
  retryAt?: number;
  fields?: Readonly<Record<string, string>>;
}
export class BusinessProblem extends Error {
  constructor(readonly issue: BusinessIssue) {
    super(issue.message);
  }
}
export function businessIssue(error: unknown): BusinessIssue {
  if (error instanceof BusinessProblem) return error.issue;
  return { kind: "unknown", message: "Не удалось выполнить запрос. Попробуйте позже.", ambiguous: true };
}
export function accessDenied(error: unknown) {
  return ["forbidden", "not-found", "unauthorized"].includes(businessIssue(error).kind);
}
const fieldMessages: Readonly<Record<string, string>> = {
  name: "Проверьте название",
  legalForm: "Выберите форму организации",
  inn: "ИНН: 10 или 12 цифр",
  kpp: "КПП: 9 цифр",
  bankName: "Название банка: до 200 символов",
  accountNumber: "Номер счёта: 20 цифр",
  externalCompanyId: "ID компании в выписке: до 100 символов",
  date: "Проверьте дату. Будущая дата остатка недопустима.",
  balance: "Проверьте сумму остатка: до 17 цифр и два знака после запятой.",
  reason: "Укажите основание: от 1 до 500 символов",
  categoryCode: "Выберите доступную категорию",
  amount: "Введите сумму больше нуля, до 17 цифр и два знака после запятой",
  asOfDate: "Проверьте дату расчёта",
};
export function mapBusinessFailure(error: unknown): BusinessIssue {
  if (error instanceof z.ZodError)
    return {
      kind: "unavailable",
      message: "Сервис вернул данные в неподдерживаемом формате.",
      ambiguous: true,
    };
  if (!(error instanceof ApiError)) return businessIssue(error);
  if (!error.retryable)
    return {
      kind: "refresh-uncertain",
      message: "Не удалось подтвердить обновление сессии. Обновите сессию или войдите снова.",
      ambiguous: true,
    };
  const seconds = error.problem.retryAfterSec;
  const retryAt =
    seconds !== null && seconds !== undefined && Number.isFinite(seconds) && seconds > 0
      ? Date.now() + seconds * 1000
      : undefined;
  if (error.status === 0)
    return {
      kind: "offline",
      message: "Нет соединения с сервером. Ответ на запрос не получен.",
      ambiguous: true,
    };
  if (error.status === 401)
    return {
      kind: "unauthorized",
      message: "Не удалось подтвердить доступ. Обновите сессию или войдите снова.",
      ambiguous: false,
    };
  if (error.status === 403)
    return {
      kind: "forbidden",
      message: "Недостаточно прав для этого действия. Обновите данные организации.",
      ambiguous: false,
    };
  if (error.status === 404)
    return {
      kind: "not-found",
      message: "Ресурс не найден или недоступен вашему аккаунту.",
      ambiguous: false,
    };
  if (error.status === 409)
    return {
      kind: error.code === "VERSION_CONFLICT" ? "version-conflict" : "conflict",
      message: "Данные изменились или команда уже существует. Перечитайте данные перед новым действием.",
      ambiguous: false,
    };
  if (error.status === 429)
    return {
      kind: "rate-limit",
      message: "Слишком много запросов. Повторите позже.",
      ambiguous: false,
      retryAt,
    };
  if (error.code === "VALIDATION_FAILED" || error.code === "MALFORMED_REQUEST")
    return {
      kind: "validation",
      message: "Проверьте данные формы.",
      ambiguous: false,
      fields: Object.fromEntries(
        (error.problem.errors ?? []).flatMap(({ field }) => {
          const message = Object.hasOwn(fieldMessages, field) ? fieldMessages[field] : undefined;
          return message ? [[field, message]] : [];
        }),
      ),
    };
  return {
    kind: "unavailable",
    message: "Сервис временно недоступен. Попробуйте позже.",
    ambiguous: error.status >= 500,
  };
}
export async function businessCall<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new BusinessProblem(mapBusinessFailure(error));
  }
}

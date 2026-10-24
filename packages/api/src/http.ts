// Legacy WEB transport for existing F1 screens. New v1 clients use browser.ts.
// Kept separate so the browser Auth/Profile flow never reads legacy CSRF cookies.
import { notify } from "@zapas/ui";

export interface Problem {
  type?: string;
  title?: string;
  instance?: string;
  status: number;
  code: string;
  detail: string;
  hint?: string;
  errors?: { field: string; code: string; message: string }[];
  traceId?: string;
  retryAfterSec?: number | null;
  attemptsLeft?: number | null;
}

export class ApiError extends Error {
  constructor(
    readonly problem: Problem,
    readonly retryable = true,
  ) {
    super(problem.detail);
    this.name = "ApiError";
  }
  get status() {
    return this.problem.status;
  }
  get code() {
    return this.problem.code;
  }
}

const API_BASE = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE ?? "";
const CSRF_COOKIE = "zapas_csrf";
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let onSessionLost: () => void = () => undefined;
/** Приложение подписывается, чтобы увести на /login при окончательной потере сессии. */
export const setSessionLostHandler = (fn: () => void) => {
  onSessionLost = fn;
};
export const emitSessionLost = () => {
  onSessionLost();
};

const readCookie = (name: string) =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);

type RefreshOutcome = "ok" | "rejected" | "transient";
let inflight: Promise<RefreshOutcome> | null = null;

async function refreshOnce(): Promise<RefreshOutcome> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: csrfHeaders("POST"),
    });
    if (res.ok) return "ok";
    return res.status === 401 ? "rejected" : "transient";
  } catch {
    return "transient";
  }
}

const refresh = () => (inflight ??= refreshOnce().finally(() => (inflight = null)));

function csrfHeaders(method: string): Record<string, string> {
  const token = MUTATING.has(method) ? readCookie(CSRF_COOKIE) : undefined;
  return token ? { "X-CSRF-Token": decodeURIComponent(token) } : {};
}

const networkProblem = (): Problem => ({
  status: 0,
  code: "NETWORK",
  detail: "Нет соединения с сервером",
});

async function toProblem(res: Response): Promise<Problem> {
  try {
    const body = (await res.json()) as Partial<Problem>;
    return {
      ...body,
      status: res.status,
      code: body.code ?? "INTERNAL",
      detail: body.detail ?? "Что-то пошло не так",
    };
  } catch {
    return {
      status: res.status,
      code: "INTERNAL",
      detail: "Сервер вернул неожиданный ответ",
    };
  }
}

export interface RequestOptions {
  /** Не показывать тост автоматически — экран обработает ошибку сам (формы, OTP). */
  silent?: boolean;
  _retried?: boolean;
}

/** Мутатор orval: (url, init) → данные. */
export async function http<T>(url: string, init: RequestInit & RequestOptions = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("X-Client", "WEB");
  for (const [k, v] of Object.entries(csrfHeaders(method))) headers.set(k, v);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      ...init,
      method,
      headers,
      credentials: "include",
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    const p = networkProblem();
    if (!init.silent)
      notify.error(p.detail, {
        description: "Проверьте интернет и попробуйте ещё раз.",
      });
    throw new ApiError(p);
  }

  if (res.status === 401 && !init._retried && !url.includes("/auth/")) {
    const outcome = await refresh();
    if (outcome === "ok") return http<T>(url, { ...init, _retried: true });
    if (outcome === "rejected") {
      onSessionLost();
      throw new ApiError({
        status: 401,
        code: "AUTH_REQUIRED",
        detail: "Сессия закончилась. Войдите снова.",
      });
    }
  }

  if (!res.ok) {
    const problem = await toProblem(res);
    if (!init.silent) report(problem);
    throw new ApiError(problem);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") return undefined as T;
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return (await res.json()) as T;
  return (await res.blob()) as T;
}

function report(p: Problem) {
  if (p.status === 429) {
    notify.warning("Слишком много запросов", {
      countdownSec: p.retryAfterSec ?? 30,
      id: "rate-limit",
    });
    return;
  }
  if (p.status === 401 || p.status === 422) return;
  notify.error(p.detail, { description: p.hint });
}

export default http;

/** Generated hooks expose the actual transport error rather than a raw wire DTO. */
export type ErrorType<_Problem> = ApiError;

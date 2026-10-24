import { notify } from "@zapas/ui";
import { ApiError, emitSessionLost, type Problem, type RequestOptions } from "./http.ts";
import { queryClient } from "./query.ts";

const AUTH = "/api/v1/auth-profile/auth";
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ANONYMOUS = new Set(
  ["csrf", "code", "verify", "refresh", "logout"].map((action) => `${AUTH}/${action}`),
);
type Options = RequestInit & RequestOptions;
interface Csrf {
  token: string;
  headerName: "X-CSRF-Token";
}

async function problemFrom(response: Response): Promise<Problem> {
  let body: Partial<Problem> = {};
  try {
    const value: unknown = await response.json();
    if (value && typeof value === "object") body = value;
  } catch {
    /* Proxies can return HTML instead of ProblemDetail. */
  }
  const retry = response.headers.get("Retry-After");
  const seconds =
    retry === null
      ? undefined
      : /^\d+$/.test(retry)
        ? Number(retry)
        : Math.max(0, Math.ceil((Date.parse(retry) - Date.now()) / 1000));
  return {
    ...body,
    status: response.status,
    code: typeof body.code === "string" ? body.code : "INTERNAL",
    detail: typeof body.detail === "string" ? body.detail : "Сервер вернул неожиданный ответ",
    retryAfterSec: Number.isFinite(seconds) ? seconds : body.retryAfterSec,
    traceId: body.traceId ?? response.headers.get("X-Trace-Id") ?? undefined,
  };
}

const networkError = () => new ApiError({ status: 0, code: "NETWORK", detail: "Нет соединения с сервером" });

/** One instance per browser session. CSRF exists only in memory; cookies stay HttpOnly. */
export function createBrowserTransport({
  baseUrl = "",
  onSessionLost = () => undefined,
  onSessionChanged = () => undefined,
}: {
  baseUrl?: string;
  onSessionLost?: () => void;
  onSessionChanged?: () => void;
} = {}) {
  let csrf: Csrf | null = null;
  let csrfFlight: Promise<Csrf> | null = null;
  let refreshFlight: Promise<unknown> | null = null;
  let refreshFailure: ApiError | null = null;
  let generation = 0;
  let identity = 0;
  let authTransitions = 0;

  async function send(path: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(`${baseUrl}${path}`, { ...init, credentials: "include" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      throw networkError();
    }
  }

  function bootstrap(force = false): Promise<Csrf> {
    if (csrfFlight) return csrfFlight;
    if (csrf && !force) return Promise.resolve(csrf);
    csrfFlight = (async () => {
      const response = await send(`${AUTH}/csrf`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new ApiError(await problemFrom(response));
      const value: unknown = await response.json();
      if (
        !value ||
        typeof value !== "object" ||
        !("token" in value) ||
        typeof value.token !== "string" ||
        !value.token ||
        !("headerName" in value) ||
        value.headerName !== "X-CSRF-Token"
      ) {
        throw new ApiError({
          status: 502,
          code: "PROTOCOL",
          detail: "Не удалось подготовить защищённый запрос",
        });
      }
      csrf = { token: value.token, headerName: value.headerName };
      return csrf;
    })().finally(() => {
      csrfFlight = null;
    });
    return csrfFlight;
  }

  async function headersFor(init: RequestInit) {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (MUTATING.has((init.method ?? "GET").toUpperCase())) {
      const binding = await bootstrap();
      headers.set(binding.headerName, binding.token);
    }
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return headers;
  }

  function rotate(explicit: boolean): Promise<unknown> {
    if (refreshFlight) return refreshFlight;
    if (refreshFailure && !explicit) return Promise.reject(refreshFailure);
    refreshFlight = (async () => {
      try {
        const headers = await headersFor({ method: "POST" });
        const response = await send(`${AUTH}/refresh`, { method: "POST", headers });
        if (!response.ok) {
          const problem = await problemFrom(response);
          if (response.status === 401) {
            csrf = null;
            identity += 1;
            onSessionLost();
          }
          throw new ApiError(problem, false);
        }
        const value: unknown = await response.json();
        generation += 1;
        refreshFailure = null;
        return value;
      } catch (error) {
        // The server may have rotated even if its response was lost. Never guess by retrying.
        refreshFailure =
          error instanceof ApiError
            ? new ApiError(error.problem, false)
            : new ApiError(
                { status: 0, code: "REFRESH_UNCERTAIN", detail: "Не удалось подтвердить обновление сессии" },
                false,
              );
        throw refreshFailure;
      }
    })().finally(() => {
      refreshFlight = null;
    });
    return refreshFlight;
  }

  async function perform<T>(url: string, init: Options, replayed: boolean): Promise<T> {
    const path = url.split("?")[0];
    const method = (init.method ?? "GET").toUpperCase();
    if (path === `${AUTH}/csrf` && method === "GET") return (await bootstrap(true)) as T;
    if (path === `${AUTH}/refresh` && method === "POST") return (await rotate(true)) as T;
    const headers = await headersFor({ ...init, method });
    const requestedGeneration = generation;
    const requestedIdentity = identity;
    const response = await send(url, { ...init, method, headers });
    if (requestedIdentity !== identity && !ANONYMOUS.has(path ?? "")) {
      throw new DOMException("Сессия изменилась", "AbortError");
    }
    if (response.status === 401 && !replayed && !ANONYMOUS.has(path ?? "")) {
      if (authTransitions) throw new ApiError(await problemFrom(response), false);
      if (requestedGeneration === generation) await rotate(false);
      if (requestedIdentity !== identity) throw new DOMException("Сессия изменилась", "AbortError");
      return request<T>(url, init, true);
    }
    if (!response.ok) {
      const problem = await problemFrom(response);
      if (problem.code === "CSRF_INVALID") csrf = null;
      throw new ApiError(problem);
    }
    if (path === `${AUTH}/verify` || path === `${AUTH}/logout`) {
      generation += 1;
      identity += 1;
      refreshFailure = null;
      if (path.endsWith("/logout")) csrf = null;
      onSessionChanged();
    }
    if (method === "DELETE" && path?.startsWith(`${AUTH}/sessions`)) csrf = null;
    if (response.status === 204 || response.headers.get("content-length") === "0") return undefined as T;
    return response.headers.get("content-type")?.includes("application/json")
      ? ((await response.json()) as T)
      : ((await response.blob()) as T);
  }
  async function request<T = unknown>(url: string, init: Options = {}, replayed = false): Promise<T> {
    const path = url.split("?")[0];
    const transition =
      (init.method ?? "GET").toUpperCase() === "POST" &&
      (path === `${AUTH}/verify` || path === `${AUTH}/logout`);
    if (!transition) return perform<T>(url, init, replayed);
    authTransitions += 1;
    try {
      // A delayed refresh response must not restore cookies after logout or overwrite a new login.
      await refreshFlight?.catch(() => undefined);
      return await perform<T>(url, init, replayed);
    } finally {
      authTransitions -= 1;
    }
  }
  return { request, refresh: () => rotate(true) };
}

const baseUrl = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE ?? "";
const browser = createBrowserTransport({
  baseUrl,
  onSessionLost: () => {
    queryClient.clear();
    emitSessionLost();
  },
  onSessionChanged: () => {
    queryClient.clear();
  },
});
export const refreshBrowserSession = () => browser.refresh();
export async function browserHttp<T>(url: string, init: Options = {}): Promise<T> {
  try {
    return await browser.request<T>(url, init);
  } catch (error) {
    if (error instanceof ApiError && !init.silent) {
      if (error.status === 429)
        notify.warning("Слишком много запросов", {
          countdownSec: error.problem.retryAfterSec ?? 30,
          id: "rate-limit",
        });
      else if (![400, 401, 403, 409, 422].includes(error.status)) notify.error(error.message);
    }
    throw error;
  }
}

/** Generated hooks expose the actual transport error rather than a raw wire DTO. */
export type ErrorType<_Problem> = ApiError;

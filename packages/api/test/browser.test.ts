import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { createBrowserTransport } from "../src/browser.ts";
import { ApiError } from "../src/http.ts";
import { queryClient } from "../src/query.ts";

vi.mock("@zapas/ui", () => ({ notify: { error: vi.fn(), warning: vi.fn() } }));
const json = (body: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
const csrf = () => json({ token: "csrf-secret", headerName: "X-CSRF-Token" });
const session = () => json({ sessionId: "session", user: { id: "user" } });
const fetchMock = vi.fn<typeof fetch>();
const urlOf = (url: Parameters<typeof fetch>[0]) =>
  typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
const respond = (handler: (...args: Parameters<typeof fetch>) => Response | Promise<Response>) =>
  fetchMock.mockImplementation((...args) => Promise.resolve().then(() => handler(...args)));
let lost: ReturnType<typeof vi.fn<() => void>>;
let transport: ReturnType<typeof createBrowserTransport>;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  lost = vi.fn();
  transport = createBrowserTransport({ onSessionLost: lost });
});
afterEach(() => vi.unstubAllGlobals());

test("anonymous OTP shares an in-memory bootstrap and includes cookies/CSRF without X-Client", async () => {
  respond((url) => (urlOf(url).endsWith("/csrf") ? csrf() : json({ challengeId: "challenge" }, 202)));
  await Promise.all(
    [1, 2].map(() =>
      transport.request("/api/v1/auth-profile/auth/code", {
        method: "POST",
        body: '{"email":"user@example.com"}',
      }),
    ),
  );
  expect(fetchMock.mock.calls.filter(([url]) => urlOf(url).endsWith("/csrf"))).toHaveLength(1);
  for (const [, init] of fetchMock.mock.calls.filter(([url]) => urlOf(url).endsWith("/code"))) {
    expect(init?.credentials).toBe("include");
    const headers = new Headers(init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-secret");
    expect(headers.has("X-Client")).toBe(false);
  }
});

test("parallel protected 401s rotate once and replay with the same command headers", async () => {
  let expired = true;
  respond((url) => {
    if (urlOf(url).endsWith("/csrf")) return csrf();
    if (urlOf(url).endsWith("/refresh")) {
      expired = false;
      return session();
    }
    return expired ? json({ code: "AUTH_REQUIRED" }, 401) : json({ items: [] });
  });
  await Promise.all(
    [1, 2].map(() =>
      transport.request("/api/v1/orchestrator/companies", {
        method: "POST",
        body: "{}",
        headers: { "Idempotency-Key": "one-attempt" },
      }),
    ),
  );
  expect(fetchMock.mock.calls.filter(([url]) => urlOf(url).endsWith("/refresh"))).toHaveLength(1);
  expect(lost).not.toHaveBeenCalled();
  for (const [, init] of fetchMock.mock.calls.filter(([url]) => urlOf(url).endsWith("/companies"))) {
    expect(new Headers(init?.headers).get("Idempotency-Key")).toBe("one-attempt");
  }
});

test("a late 401 from the old generation does not rotate a freshly issued refresh again", async () => {
  let lateResolve: ((value: Response) => void) | undefined;
  let companyCalls = 0;
  respond((url) => {
    if (urlOf(url).endsWith("/csrf")) return csrf();
    if (urlOf(url).endsWith("/refresh")) return session();
    companyCalls += 1;
    if (companyCalls === 1)
      return new Promise<Response>((resolve) => {
        lateResolve = resolve;
      });
    return companyCalls === 2 ? json({}, 401) : json({ items: [] });
  });
  const late = transport.request("/api/v1/orchestrator/companies");
  await transport.request("/api/v1/orchestrator/companies");
  lateResolve?.(json({}, 401));
  await late;
  expect(fetchMock.mock.calls.filter(([url]) => urlOf(url).endsWith("/refresh"))).toHaveLength(1);
});

test("lost refresh response blocks automatic rotation until explicit recovery, without logging out", async () => {
  respond((url) => {
    if (urlOf(url).endsWith("/csrf")) return csrf();
    if (urlOf(url).endsWith("/refresh")) throw new TypeError("offline after send");
    return json({}, 401);
  });
  for (const attempt of [1, 2]) {
    await expect(
      transport.request(`/api/v1/orchestrator/companies?attempt=${String(attempt)}`),
    ).rejects.toMatchObject({ retryable: false });
  }
  expect(fetchMock.mock.calls.filter(([url]) => urlOf(url).endsWith("/refresh"))).toHaveLength(1);
  expect(lost).not.toHaveBeenCalled();
  respond((url) => (urlOf(url).endsWith("/csrf") ? csrf() : session()));
  await transport.refresh();
  expect(fetchMock.mock.calls.filter(([url]) => urlOf(url).endsWith("/refresh"))).toHaveLength(2);
});

test("only a terminal refresh 401 signals session loss; OTP 401 never attempts refresh", async () => {
  respond((url) => (urlOf(url).endsWith("/csrf") ? csrf() : json({ code: "REFRESH_INVALID" }, 401)));
  await expect(transport.request("/api/v1/orchestrator/companies")).rejects.toBeInstanceOf(ApiError);
  expect(lost).toHaveBeenCalledTimes(1);
  fetchMock.mockClear();
  await expect(
    transport.request("/api/v1/auth-profile/auth/verify", { method: "POST", body: "{}" }),
  ).rejects.toBeInstanceOf(ApiError);
  expect(fetchMock.mock.calls.some(([url]) => urlOf(url).endsWith("/refresh"))).toBe(false);
});

test("Problem HTTP status is authoritative and Retry-After header is retained", async () => {
  fetchMock.mockResolvedValue(
    json({ status: 200, detail: "Later", code: "RATE_LIMITED" }, 429, { "Retry-After": "17" }),
  );
  await expect(transport.request("/api/v1/orchestrator/companies")).rejects.toMatchObject({
    problem: { status: 429, code: "RATE_LIMITED", retryAfterSec: 17 },
  });
});

test("multipart upload keeps the browser boundary and AbortError never refreshes", async () => {
  respond((url) => (urlOf(url).endsWith("/csrf") ? csrf() : json({ state: "COMMITTED" })));
  const body = new FormData();
  body.set("file", new Blob(["csv"]), "statement.csv");
  await transport.request("/api/v1/preprocessor/companies/company/imports", { method: "POST", body });
  const upload = fetchMock.mock.calls.at(-1)?.[1];
  expect(new Headers(upload?.headers).has("Content-Type")).toBe(false);
  fetchMock.mockRejectedValue(new DOMException("cancelled", "AbortError"));
  await expect(transport.request("/api/v1/orchestrator/companies")).rejects.toMatchObject({
    name: "AbortError",
  });
});

test("query retries cannot repeat a refresh whose outcome is unknown", () => {
  const retry = queryClient.getDefaultOptions().queries?.retry;
  if (typeof retry !== "function") throw Error("Expected the shared retry policy");
  expect(
    retry(0, new ApiError({ status: 503, code: "DEPENDENCY_UNAVAILABLE", detail: "Later" }, false)),
  ).toBe(false);
  expect(retry(0, new ApiError({ status: 503, code: "DEPENDENCY_UNAVAILABLE", detail: "Later" }))).toBe(true);
});

test("CSRF invalidation bootstraps again on the next attempt without replaying the mutation", async () => {
  let mutationCalls = 0;
  respond((url) => {
    if (urlOf(url).endsWith("/csrf")) return csrf();
    mutationCalls += 1;
    return mutationCalls === 1 ? json({ code: "CSRF_INVALID" }, 403) : json({ ok: true });
  });
  const options = { method: "PUT", body: '{"displayName":"User","version":0}' };
  await expect(transport.request("/api/v1/auth-profile/profile/me", options)).rejects.toMatchObject({
    status: 403,
  });
  expect(mutationCalls).toBe(1);
  await transport.request("/api/v1/auth-profile/profile/me", options);
  expect(fetchMock.mock.calls.filter(([url]) => urlOf(url).endsWith("/csrf"))).toHaveLength(2);
  expect(lost).not.toHaveBeenCalled();
});

test("a malformed bootstrap does not send an OTP mutation or accept a dynamic authorization header", async () => {
  fetchMock.mockResolvedValue(json({ token: "secret", headerName: "Authorization" }));
  await expect(
    transport.request("/api/v1/auth-profile/auth/code", { method: "POST", body: "{}" }),
  ).rejects.toMatchObject({ status: 502 });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("logout waits for the active refresh before revoking the selected browser session", async () => {
  let finishRefresh: ((response: Response) => void) | undefined;
  let logoutSent = false;
  respond((url) => {
    if (urlOf(url).endsWith("/csrf")) return csrf();
    if (urlOf(url).endsWith("/refresh"))
      return new Promise<Response>((resolve) => {
        finishRefresh = resolve;
      });
    if (urlOf(url).endsWith("/logout")) {
      logoutSent = true;
      return new Response(null, { status: 204 });
    }
    return json({}, 401);
  });
  const pending = transport.request("/api/v1/orchestrator/companies");
  await vi.waitFor(() => expect(finishRefresh).toBeTypeOf("function"));
  const logout = transport.request("/api/v1/auth-profile/auth/logout", { method: "POST" });
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
  expect(logoutSent).toBe(false);
  finishRefresh?.(session());
  await logout;
  await expect(pending).rejects.toMatchObject({ status: 401 });
  expect(logoutSent).toBe(true);
});

test("a delayed private response cannot enter the next session after logout", async () => {
  let finishPrivate: ((response: Response) => void) | undefined;
  respond((url) => {
    if (urlOf(url).endsWith("/csrf")) return csrf();
    if (urlOf(url).endsWith("/logout")) return new Response(null, { status: 204 });
    return new Promise<Response>((resolve) => {
      finishPrivate = resolve;
    });
  });
  const privateResult = transport.request("/api/v1/orchestrator/companies").catch((error: unknown) => error);
  await vi.waitFor(() => expect(finishPrivate).toBeTypeOf("function"));
  await transport.request("/api/v1/auth-profile/auth/logout", { method: "POST" });
  finishPrivate?.(json({ items: [{ id: "previous-user-private-company" }] }));
  expect(await privateResult).toMatchObject({ name: "AbortError" });
});

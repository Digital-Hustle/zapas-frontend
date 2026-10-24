import { z } from "zod";

// Preview only. No cookies, real identities, persistence, email or network fallback.
export const DEMO_CODE = "000123";
const auth = "/api/v1/auth-profile/auth";
const profilePath = "/api/v1/auth-profile/profile/me";
const companiesPath = "/api/v1/orchestrator/companies";
const userId = "00000000-0000-4000-8000-000000000010";
const sessionId = "00000000-0000-4000-8000-000000000011";
const csrf = "preview-only-csrf";
const text = (max: number) =>
  z
    .string()
    .max(max)
    .refine((v) => /\S/u.test(v));
const companyBody = z
  .object({
    name: text(200),
    legalForm: z.enum(["OOO", "IP", "OTHER"]),
    inn: z.string().nullable(),
    kpp: z.string().nullable(),
    timezone: z.literal("Europe/Moscow"),
  })
  .strict();
const accountBody = z
  .object({
    name: text(100),
    bankName: z.string().nullable(),
    accountNumber: z.string().nullable(),
    externalCompanyId: z.string().nullable(),
  })
  .strict();
const anchorBody = z
  .object({ date: z.iso.date(), balance: z.string().regex(/^-?[0-9]{1,17}\.[0-9]{2}$/u), reason: text(500) })
  .strict();
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow" }).format(new Date());
const instant = () => new Date().toISOString();
const after = (ms: number) => new Date(Date.now() + ms).toISOString();
function company(id: string, name: string, role: "OWNER" | "VIEWER" = "OWNER") {
  return {
    id,
    name,
    legalForm: "OOO",
    inn: null as string | null,
    kpp: null as string | null,
    timezone: "Europe/Moscow",
    ownerUserId: userId,
    myRole: role,
    permissions: {
      canEditCompany: role === "OWNER",
      canManageMembers: role === "OWNER",
      canImport: role === "OWNER",
      canEditPayments: role === "OWNER",
      canManagePlans: role === "OWNER",
      canRunForecast: role === "OWNER",
      canRunBacktest: role === "OWNER",
    },
    archived: false,
    version: 1,
    dataVersion: 0,
    createdAt: instant(),
    updatedAt: instant(),
  };
}
function account(companyId: string, name: string) {
  return {
    id: crypto.randomUUID(),
    companyId,
    name,
    bankName: null as string | null,
    accountNumber: null as string | null,
    externalCompanyId: null as string | null,
    currency: "RUB",
    archived: false,
    latestBalance: null as string | null,
    latestBalanceDate: null as string | null,
    version: 1,
  };
}
function json(value: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Zapas-Demo": "true" },
  });
}
function problem(status: number, code: string) {
  const response = json(
    {
      type: "about:blank",
      title: "Демонстрационный API",
      status,
      code,
      detail: "Действие недоступно в демонстрации",
      errors: [],
      traceId: "preview",
      retryAfterSec: null,
    },
    status,
  );
  response.headers.set("Content-Type", "application/problem+json");
  return response;
}

/** Isolated per page. Unhandled API paths fail closed, never reach a real backend. */
export function createPreviewFetch(network: typeof fetch, origin: string): typeof fetch {
  let authenticated = false;
  let challenge: { id: string; expires: number; attempts: number } | null = null;
  const profile = {
    id: userId,
    email: "demo@example.test",
    displayName: "Демо-пользователь",
    version: 0,
    createdAt: instant(),
    updatedAt: instant(),
  };
  const owner = company("00000000-0000-4000-8000-000000000001", "Демо · Кофейня «Утро»");
  const viewer = company("00000000-0000-4000-8000-000000000002", "Демо · Доступ для просмотра", "VIEWER");
  const companies = [owner, viewer];
  const primary = {
    ...account(owner.id, "Основной счёт"),
    bankName: "Демонстрационный банк",
    accountNumber: "00000000000000000001",
    latestBalance: "245000.00",
    latestBalanceDate: today(),
  };
  const accounts = [
    primary,
    account(owner.id, "Новый счёт без остатка"),
    account(viewer.id, "Счёт для просмотра"),
  ];
  let sessions = [sessionId, "00000000-0000-4000-8000-000000000012"].map((id) => ({
    id,
    current: id === sessionId,
    createdAt: instant(),
    lastSeenAt: instant(),
    expiresAt: after(86400000),
  }));
  const commands = new Map<string, { fingerprint: string; body: string; status: number }>();
  const session = () => ({
    sessionId,
    user: profile,
    accessExpiresAt: after(900000),
    refreshExpiresAt: after(86400000),
  });
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), origin);
    if (!url.pathname.startsWith("/api/")) return network(input, init);
    const request = new Request(input instanceof Request ? input : url, init);
    request.signal.throwIfAborted();
    if (url.origin !== origin) return problem(503, "DEPENDENCY_UNAVAILABLE");
    const path = url.pathname;
    const method = request.method;
    if (
      !path.startsWith(auth + "/") &&
      path !== profilePath &&
      path !== companiesPath &&
      !path.startsWith(companiesPath + "/")
    )
      return problem(503, "DEPENDENCY_UNAVAILABLE");
    const raw = await request.text();
    request.signal.throwIfAborted();
    let body: unknown;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return problem(400, "MALFORMED_REQUEST");
    }
    if (method !== "GET" && request.headers.get("X-CSRF-Token") !== csrf) return problem(403, "CSRF_INVALID");
    try {
      if (path === `${auth}/csrf` && method === "GET")
        return json({ token: csrf, headerName: "X-CSRF-Token" });
      if (path === `${auth}/code` && method === "POST") {
        z.object({ email: z.email().max(254) })
          .strict()
          .parse(body);
        // Deliberately discard the entered email; never send mail or store contact data.
        challenge = { id: crypto.randomUUID(), expires: Date.now() + 300000, attempts: 0 };
        return json(
          {
            challengeId: challenge.id,
            codeLength: 6,
            expiresAt: after(300000),
            resendAvailableAt: after(30000),
          },
          202,
        );
      }
      if (path === `${auth}/verify` && method === "POST") {
        const value = z
          .object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/u) })
          .strict()
          .parse(body);
        if (value.challengeId !== challenge?.id) return problem(400, "CODE_EXPIRED");
        if (Date.now() >= challenge.expires) return problem(400, "CODE_EXPIRED");
        if (challenge.attempts >= 5) return problem(429, "CODE_ATTEMPTS_EXCEEDED");
        if (value.code !== DEMO_CODE) {
          challenge.attempts += 1;
          return problem(400, "CODE_INVALID");
        }
        challenge = null;
        authenticated = true;
        if (!sessions.some((s) => s.current))
          sessions = [
            {
              id: sessionId,
              current: true,
              createdAt: instant(),
              lastSeenAt: instant(),
              expiresAt: after(86400000),
            },
          ];
        return json(session());
      }
      if (path === `${auth}/refresh` && method === "POST")
        return authenticated ? json(session()) : problem(401, "REFRESH_INVALID");
      if (path === `${auth}/logout` && method === "POST") {
        authenticated = false;
        return json(null, 204);
      }
      if (!authenticated) return problem(401, "AUTHENTICATION_REQUIRED");
      if (path === profilePath && method === "GET") return json(profile);
      if (path === profilePath && method === "PUT") {
        const value = z
          .object({ displayName: text(100), version: z.number().int().nonnegative() })
          .strict()
          .parse(body);
        if (value.version !== profile.version) return problem(409, "PROFILE_VERSION_CONFLICT");
        Object.assign(profile, value, { version: profile.version + 1, updatedAt: instant() });
        return json(profile);
      }
      if (path === `${auth}/sessions` && method === "GET")
        return json({ items: sessions, total: sessions.length });
      if ((path === `${auth}/sessions` || path.startsWith(`${auth}/sessions/`)) && method === "DELETE") {
        const id = path === `${auth}/sessions` ? null : path.split("/").at(-1);
        if (id && !sessions.some((s) => s.id === id)) return problem(404, "SESSION_NOT_FOUND");
        sessions = id ? sessions.filter((s) => s.id !== id) : [];
        if (!id || id === sessionId) authenticated = false;
        return json(null, 204);
      }
      if (path !== companiesPath && !path.startsWith(companiesPath + "/"))
        return problem(503, "DEPENDENCY_UNAVAILABLE");
      const page = (items: readonly unknown[]) => {
        const number = z.coerce
          .number()
          .int()
          .nonnegative()
          .parse(url.searchParams.get("page") ?? 0);
        const size = z.coerce
          .number()
          .int()
          .min(1)
          .max(200)
          .parse(url.searchParams.get("size") ?? 10);
        return json({
          items: items.slice(number * size, (number + 1) * size),
          page: { page: number, size, total: items.length, hasNext: (number + 1) * size < items.length },
        });
      };
      const key = method === "POST" ? z.uuid().parse(request.headers.get("Idempotency-Key")) : "";
      const commandId = `${path}:${key}`;
      const fingerprint = JSON.stringify([body, request.headers.get("If-Match")]);
      const replay = key ? commands.get(commandId) : undefined;
      if (replay)
        return replay.fingerprint === fingerprint
          ? new Response(replay.body, {
              status: replay.status,
              headers: {
                "Content-Type": "application/json",
                "X-Zapas-Demo": "true",
                "Cache-Control": "no-store",
              },
            })
          : problem(409, "IDEMPOTENCY_CONFLICT");
      const created = (value: unknown, status = 201) => {
        commands.set(commandId, { fingerprint, body: JSON.stringify(value), status });
        return json(value, status);
      };
      if (path === companiesPath && method === "GET") return page(companies);
      if (path === companiesPath && method === "POST") {
        const value = { ...company(crypto.randomUUID(), ""), ...companyBody.parse(body) };
        companies.push(value);
        return created(value);
      }
      const parts = path.slice(companiesPath.length).split("/").filter(Boolean);
      const scope = companies.find((c) => c.id === parts[0]);
      if (!scope) return problem(404, "NOT_FOUND");
      if (parts.length === 1 && method === "GET") return json(scope);
      if (parts[1] === "accounts" && parts.length === 2 && method === "GET")
        return page(accounts.filter((a) => a.companyId === scope.id));
      const value =
        parts[1] === "accounts" && parts.length >= 3
          ? accounts.find((a) => a.id === parts[2] && a.companyId === scope.id)
          : undefined;
      if (parts[1] === "accounts" && parts.length >= 3 && !value) return problem(404, "NOT_FOUND");
      if (parts.length === 3 && value && method === "GET") return json(value);
      if (scope.archived || scope.myRole === "VIEWER") return problem(403, "FORBIDDEN");
      if (parts.length === 1 && method === "PUT") {
        if (request.headers.get("If-Match") !== `"${scope.version}"`) return problem(409, "VERSION_CONFLICT");
        Object.assign(scope, companyBody.parse(body), { version: scope.version + 1, updatedAt: instant() });
        return json(scope);
      }
      if (parts[1] === "archive" && parts.length === 2 && method === "POST") {
        if (request.headers.get("If-Match") !== `"${scope.version}"`) return problem(409, "VERSION_CONFLICT");
        scope.archived = true;
        scope.version += 1;
        return created(scope, 200);
      }
      if (parts[1] === "accounts" && parts.length === 2 && method === "POST") {
        const value = { ...account(scope.id, ""), ...accountBody.parse(body) };
        accounts.push(value);
        return created(value);
      }
      if (!value) return problem(404, "NOT_FOUND");
      if (value.archived) return problem(403, "FORBIDDEN");
      if (parts.length === 3 && method === "PUT") {
        if (request.headers.get("If-Match") !== `"${value.version}"`) return problem(409, "VERSION_CONFLICT");
        Object.assign(value, accountBody.parse(body), { version: value.version + 1 });
        return json(value);
      }
      if (parts.length === 4 && parts[3] === "archive" && method === "POST") {
        if (request.headers.get("If-Match") !== `"${value.version}"`) return problem(409, "VERSION_CONFLICT");
        value.archived = true;
        value.version += 1;
        return created(value, 200);
      }
      if (parts.length === 4 && parts[3] === "balance-anchors" && method === "POST") {
        const anchor = anchorBody.parse(body);
        if (anchor.date > today()) return problem(400, "VALIDATION_FAILED");
        if (value.latestBalanceDate === null || anchor.date >= value.latestBalanceDate) {
          value.latestBalance = anchor.balance;
          value.latestBalanceDate = anchor.date;
        }
        scope.dataVersion += 1;
        return created({
          id: crypto.randomUUID(),
          accountId: value.id,
          ...anchor,
          source: "MANUAL",
          createdAt: instant(),
        });
      }
      return problem(503, "DEPENDENCY_UNAVAILABLE");
    } catch (error) {
      if (error instanceof z.ZodError) return problem(400, "VALIDATION_FAILED");
      throw error;
    }
  };
}

export function installPreviewApi() {
  window.fetch = createPreviewFetch(window.fetch.bind(window), window.location.origin);
}

import { z } from "zod";

interface Company {
  id: string;
  archived: boolean;
  myRole: string;
}
interface Account {
  id: string;
  companyId: string;
  archived: boolean;
}
const now = () => new Date().toISOString();
const today = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Moscow" }).format(new Date());
const code = z.enum(["OTHER", "RENT", "SALES", "TRANSFER"]);
const categories = [
  { code: "OTHER", name: "Прочее", directions: ["IN", "OUT"], system: true },
  { code: "RENT", name: "Аренда", directions: ["OUT"], system: true },
  { code: "SALES", name: "Продажи", directions: ["IN"], system: true },
  { code: "TRANSFER", name: "Переводы", directions: ["IN", "OUT"], system: true },
];
function report(companyId: string, accountId: string, fileName: string, fileSha256: string) {
  return {
    id: crypto.randomUUID(),
    companyId,
    accountId,
    status: "COMMITTED",
    fileName,
    fileSha256,
    totalRows: 2,
    acceptedRows: 2,
    rejectedRows: 0,
    duplicateRows: 0,
    warningCount: 1,
    fromDate: today(),
    toDate: today(),
    createdAt: now(),
    completedAt: now(),
    dataVersion: 1,
  };
}
function samplePayments(value: ReturnType<typeof report>) {
  return ["OUT", "IN"].map((direction) => ({
    id: crypto.randomUUID(),
    companyId: value.companyId,
    accountId: value.accountId,
    importId: value.id,
    externalOperationId: null,
    operationDate: today(),
    amount: direction === "OUT" ? "42000.00" : "150000.50",
    direction,
    counterpartyInn: direction === "OUT" ? "0000000001" : "0000000002",
    counterpartyName: direction === "OUT" ? "Демо · Арендодатель" : "Демо · Покупатель",
    purpose: "Демонстрационная операция, не данные выписки",
    categoryCode: "OTHER",
    categorySource: "OTHER",
    ruleVersion: null,
    balanceEod: null,
    allocatedAmount: "0.00",
    version: 1,
    createdAt: now(),
  }));
}
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", "X-Zapas-Demo": "true", "Cache-Control": "no-store" },
  });
}
function problem(status: number, code: string) {
  const response = json(
    {
      status,
      code,
      title: "Демонстрационный API",
      detail: "Действие недоступно в демонстрации",
      errors: [],
      traceId: "preview",
    },
    status,
  );
  response.headers.set("Content-Type", "application/problem+json");
  return response;
}
function paged(items: readonly unknown[], url: URL, defaultSize: number) {
  const page = z.coerce
    .number()
    .int()
    .min(0)
    .parse(url.searchParams.get("page") ?? 0);
  const size = z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .parse(url.searchParams.get("size") ?? defaultSize);
  return json({
    items: items.slice(page * size, (page + 1) * size),
    page: { page, size, total: items.length, hasNext: (page + 1) * size < items.length },
  });
}

/** CSV reports and facts are explicitly synthetic; uploaded CSV rows are never interpreted. */
export function createBusinessPreview(companies: Company[], accounts: Account[]) {
  const first = accounts[0];
  const reports = first ? [report(first.companyId, first.id, "demo-example.csv", "a".repeat(64))] : [];
  const payments = reports.flatMap(samplePayments);
  const replay = new Map<string, { fingerprint: string; value: unknown; status: number }>();
  return async (request: Request, body: unknown): Promise<Response | null> => {
    const url = new URL(request.url),
      method = request.method;
    const match =
      /^\/api\/v1\/(orchestrator|preprocessor)\/companies\/([^/]+)\/(imports|payments|categories|counterparties)(?:\/(.*))?$/u.exec(
        url.pathname,
      );
    if (!match) return null;
    const [, transport, companyId, resource, rest = ""] = match;
    const company = companies.find((c) => c.id === companyId);
    if (!company) return problem(404, "NOT_FOUND");
    const writable = !company.archived && company.myRole !== "VIEWER";
    const account = (id: string) => accounts.find((a) => a.companyId === company.id && a.id === id);
    const categoryAllowed = (category: string, direction: string) =>
      categories.some((c) => c.code === category && c.directions.includes(direction));
    try {
      if (method === "POST" && transport === "preprocessor" && resource === "imports" && !rest) {
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File) || !/\.csv$/iu.test(file.name))
          return problem(415, "UNSUPPORTED_MEDIA_TYPE");
        if (!file.size || file.size > 20 * 1024 * 1024) return problem(413, "PAYLOAD_TOO_LARGE");
        const value = account(z.uuid().parse(form.get("accountId")));
        if (!value) return problem(404, "NOT_FOUND");
        if (!writable || value.archived) return problem(403, "FORBIDDEN");
        z.enum(["ATOMIC", "SKIP_INVALID"]).parse(form.get("validationMode"));
        const complete = z.enum(["UNKNOWN", "CONFIRMED_COMPLETE"]).parse(form.get("completeness"));
        const from =
          complete === "CONFIRMED_COMPLETE" ? z.iso.date().parse(form.get("declaredFromDate")) : today();
        const to =
          complete === "CONFIRMED_COMPLETE" ? z.iso.date().parse(form.get("declaredToDate")) : today();
        if (from > to) return problem(400, "VALIDATION_FAILED");
        const key = `${url.pathname}:${z.uuid().parse(request.headers.get("Idempotency-Key"))}`;
        const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()))]
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("");
        const fingerprint = JSON.stringify([
          value.id,
          file.name,
          hash,
          form.get("validationMode"),
          complete,
          from,
          to,
        ]);
        const prior = replay.get(key);
        if (prior)
          return prior.fingerprint === fingerprint
            ? json(prior.value, prior.status)
            : problem(409, "IDEMPOTENCY_CONFLICT");
        const result = { ...report(company.id, value.id, file.name, hash), fromDate: from, toDate: to };
        reports.unshift(result);
        payments.push(...samplePayments(result));
        replay.set(key, { fingerprint, value: result, status: 201 });
        return json(result, 201);
      }
      if (transport !== "orchestrator") return problem(503, "DEPENDENCY_UNAVAILABLE");
      if (resource === "imports" && method === "GET") {
        if (!rest) {
          const value = account(z.uuid().parse(url.searchParams.get("accountId")));
          return value
            ? paged(
                reports.filter((r) => r.companyId === company.id && r.accountId === value.id),
                url,
                10,
              )
            : problem(404, "NOT_FOUND");
        }
        const [id, action] = rest.split("/");
        const value = reports.find((r) => r.id === id && r.companyId === company.id);
        if (!value) return problem(404, "NOT_FOUND");
        if (!action) return json(value);
        if (action === "issues")
          return paged(
            [
              {
                id: value.id,
                severity: "WARNING",
                code: "DEMO_REPORT",
                rowNumber: null,
                field: null,
                message:
                  "Демонстрационный отчёт: содержимое файла не анализировалось. Показаны две тестовые операции.",
              },
            ],
            url,
            20,
          );
      }
      if (resource === "categories" && method === "GET" && !rest) return json({ items: categories });
      if ((resource === "counterparties" || (resource === "payments" && !rest)) && method === "GET") {
        const value = account(z.uuid().parse(url.searchParams.get("accountId")));
        if (!value) return problem(404, "NOT_FOUND");
        const rows = payments.filter((p) => p.companyId === company.id && p.accountId === value.id);
        const q = (url.searchParams.get("q") ?? "").toLocaleLowerCase("ru-RU");
        if (resource === "counterparties") {
          const distinct = [
            ...new Map(
              rows.map((p) => [
                `inn:${p.counterpartyInn}`,
                { key: `inn:${p.counterpartyInn}`, inn: p.counterpartyInn, name: p.counterpartyName },
              ]),
            ).values(),
          ];
          return paged(
            distinct.filter((p) => `${p.name} ${p.inn}`.toLocaleLowerCase("ru-RU").includes(q)),
            url,
            50,
          );
        }
        const filtered = rows.filter(
          (p) =>
            (!url.searchParams.get("direction") || p.direction === url.searchParams.get("direction")) &&
            (!url.searchParams.get("categoryCode") ||
              p.categoryCode === url.searchParams.get("categoryCode")) &&
            (!url.searchParams.get("counterpartyKey") ||
              `inn:${p.counterpartyInn}` === url.searchParams.get("counterpartyKey")) &&
            (!url.searchParams.get("fromDate") ||
              p.operationDate >= (url.searchParams.get("fromDate") ?? "")) &&
            (!url.searchParams.get("toDate") || p.operationDate <= (url.searchParams.get("toDate") ?? "")) &&
            `${p.purpose} ${p.counterpartyName}`.toLocaleLowerCase("ru-RU").includes(q),
        );
        const descending = url.searchParams.get("sort") !== "operationDate,asc";
        filtered.sort(
          (a, b) =>
            (a.operationDate.localeCompare(b.operationDate) || a.id.localeCompare(b.id)) *
            (descending ? -1 : 1),
        );
        return paged(filtered, url, 25);
      }
      if (resource === "payments" && rest === "category-changes" && method === "POST") {
        if (!writable) return problem(403, "FORBIDDEN");
        const value = z
          .object({
            categoryCode: code,
            payments: z
              .array(z.object({ paymentId: z.uuid(), expectedVersion: z.number().int().positive() }).strict())
              .min(1)
              .max(200),
          })
          .strict()
          .parse(body);
        if (new Set(value.payments.map((p) => p.paymentId)).size !== value.payments.length)
          return problem(400, "VALIDATION_FAILED");
        const key = `${url.pathname}:${z.uuid().parse(request.headers.get("Idempotency-Key"))}`;
        const fingerprint = JSON.stringify(body),
          prior = replay.get(key);
        if (prior)
          return prior.fingerprint === fingerprint ? json(prior.value) : problem(409, "IDEMPOTENCY_CONFLICT");
        const rows = value.payments.map((item) =>
          payments.find((p) => p.id === item.paymentId && p.companyId === company.id),
        );
        if (rows.some((p) => !p)) return problem(404, "NOT_FOUND");
        if (rows.some((p) => p && account(p.accountId)?.archived)) return problem(403, "FORBIDDEN");
        if (rows.some((p, i) => p?.version !== value.payments[i]?.expectedVersion))
          return problem(409, "VERSION_CONFLICT");
        if (rows.some((p) => p && !categoryAllowed(value.categoryCode, p.direction)))
          return problem(400, "VALIDATION_FAILED");
        const items = rows.flatMap((p) => {
          if (!p) return [];
          Object.assign(p, {
            categoryCode: value.categoryCode,
            categorySource: "USER",
            version: p.version + 1,
          });
          return [{ ...p }];
        });
        const result = { items };
        replay.set(key, { fingerprint, value: result, status: 200 });
        return json(result);
      }
      if (resource === "payments") {
        const [id, action] = rest.split("/");
        const value = payments.find((p) => p.id === id && p.companyId === company.id);
        if (!value) return problem(404, "NOT_FOUND");
        if (method === "GET" && !action) return json(value);
        if (method === "PATCH" && action === "category") {
          if (!writable || account(value.accountId)?.archived) return problem(403, "FORBIDDEN");
          if (request.headers.get("If-Match") !== `"${value.version}"`)
            return problem(409, "VERSION_CONFLICT");
          const change = z.object({ categoryCode: code }).strict().parse(body);
          if (!categoryAllowed(change.categoryCode, value.direction))
            return problem(400, "VALIDATION_FAILED");
          Object.assign(value, { ...change, categorySource: "USER", version: value.version + 1 });
          return json(value);
        }
      }
      return problem(503, "DEPENDENCY_UNAVAILABLE");
    } catch (error) {
      if (error instanceof z.ZodError) return problem(400, "VALIDATION_FAILED");
      throw error;
    }
  };
}

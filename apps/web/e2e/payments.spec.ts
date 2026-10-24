import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";

const companyId = "00000000-0000-4000-8000-000000000001";
const accountId = "00000000-0000-4000-8000-000000000003";
const userId = "00000000-0000-4000-8000-000000000010";
const firstId = "00000000-0000-4000-8000-000000000020";
const secondId = "00000000-0000-4000-8000-000000000021";
const root = `/api/v1/orchestrator/companies/${companyId}`;
const screen = `/app/payments?company=${companyId}&account=${accountId}`;
const time = "2026-10-24T09:00:00Z";
function payment(id = firstId, direction = "OUT") {
  return {
    id,
    companyId,
    accountId,
    importId: "00000000-0000-4000-8000-000000000030",
    externalOperationId: null,
    operationDate: "2026-10-23",
    amount: "99999999999999999.99",
    direction,
    counterpartyInn: "0000000001",
    counterpartyName: id === firstId ? "Поставщик из примера" : "Покупатель из примера",
    purpose: "Оплата по договору <script>private</script>",
    categoryCode: "OTHER",
    categorySource: "OTHER",
    ruleVersion: null,
    balanceEod: null as string | null,
    allocatedAmount: "0.00",
    version: 1,
    createdAt: time,
  };
}
async function service(page: Page, role = "OWNER", archived = false) {
  const state = {
    role,
    archived,
    payments: [payment(), { ...payment(secondId, "IN"), amount: "150000.50", balanceEod: "-100.01" }],
    failList: false,
    denyList: false,
    denyDetail: false,
    failDetail: false,
    wrongDetailScope: false,
    dropPatch: false,
    dropBulk: false,
    denyWrite: false,
    morePages: false,
    listQueries: [] as Record<string, string>[],
    counterpartyQueries: [] as Record<string, string>[],
    patches: [] as { body: { categoryCode: string }; match: string }[],
    bulks: [] as {
      body: { categoryCode: string; payments: { paymentId: string; expectedVersion: number }[] };
      key: string;
    }[],
    requests: [] as string[],
    problems: [] as string[],
    detailReads: 0,
  };
  const categories = [
    { code: "OTHER", name: "Прочее", directions: ["IN", "OUT"], system: true },
    { code: "RENT", name: "Аренда", directions: ["OUT"], system: true },
    { code: "SALES", name: "Продажи", directions: ["IN"], system: true },
    { code: "TRANSFER", name: "Переводы", directions: ["IN", "OUT"], system: true },
  ];
  const replay = new Map<string, unknown>();
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname,
      method = request.method(),
      headers = request.headers();
    state.requests.push(`${method} ${path}`);
    const json = (value: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });
    const problem = (status: number, code: string) =>
      json(
        {
          status,
          code,
          title: "Request failed",
          detail: "private-server-detail",
          errors: [],
          retryAfterSec: null,
        },
        status,
      );
    if (["x-client", "x-user-id", "x-auth-session-id", "authorization"].some((key) => headers[key]))
      state.problems.push("unexpected identity header");
    if (path === "/api/v1/auth-profile/profile/me")
      return json({
        id: userId,
        email: "owner@example.test",
        displayName: null,
        version: 0,
        createdAt: time,
        updatedAt: time,
      });
    if (path === "/api/v1/auth-profile/auth/csrf")
      return json({ token: "modeled-csrf", headerName: "X-CSRF-Token" });
    if (method !== "GET" && headers["x-csrf-token"] !== "modeled-csrf") state.problems.push("missing CSRF");
    if (path === root && method === "GET")
      return json({
        id: companyId,
        name: "Компания из примера",
        legalForm: "OOO",
        inn: null,
        kpp: null,
        timezone: "Europe/Moscow",
        ownerUserId: userId,
        myRole: state.role,
        permissions: {
          canEditCompany: state.role === "OWNER",
          canManageMembers: state.role === "OWNER",
          canImport: state.role !== "VIEWER",
          canEditPayments: state.role !== "VIEWER",
          canManagePlans: state.role !== "VIEWER",
          canRunForecast: state.role !== "VIEWER",
          canRunBacktest: state.role !== "VIEWER",
        },
        archived: false,
        dataVersion: 1,
        version: 1,
        createdAt: time,
        updatedAt: time,
      });
    if (path === `${root}/accounts/${accountId}`)
      return json({
        id: accountId,
        companyId,
        name: "Расчётный счёт",
        bankName: null,
        accountNumber: null,
        externalCompanyId: null,
        currency: "RUB",
        archived: state.archived,
        latestBalance: null,
        latestBalanceDate: null,
        version: 1,
      });
    if (path === `${root}/categories`) return json({ items: categories });
    if (path === `${root}/counterparties`) {
      state.counterpartyQueries.push(Object.fromEntries(url.searchParams));
      const number = Number(url.searchParams.get("page") ?? "0");
      return json({
        items: [
          {
            key: number ? "inn:0000000002" : "inn:0000000001",
            inn: number ? "0000000002" : "0000000001",
            name: number ? "Второй контрагент" : "Поставщик из примера",
          },
        ],
        page: { page: number, size: 50, total: 51, hasNext: number === 0 },
      });
    }
    if (path === `${root}/payments` && method === "GET") {
      state.listQueries.push(Object.fromEntries(url.searchParams));
      if (state.denyList) return problem(403, "FORBIDDEN");
      if (state.failList) return problem(503, "DEPENDENCY_UNAVAILABLE");
      const number = Number(url.searchParams.get("page") ?? "0");
      return json({
        items:
          url.searchParams.get("q") === "ничего"
            ? []
            : number
              ? [
                  {
                    ...payment("00000000-0000-4000-8000-000000000022"),
                    counterpartyName: "Следующая страница",
                  },
                ]
              : state.payments,
        page: {
          page: number,
          size: 25,
          total: state.morePages ? 26 : state.payments.length,
          hasNext: state.morePages && number === 0,
        },
      });
    }
    if (path === `${root}/payments/category-changes` && method === "POST") {
      const body = z
        .object({
          categoryCode: z.string(),
          payments: z
            .array(z.object({ paymentId: z.uuid(), expectedVersion: z.number().int().positive() }).strict())
            .min(1)
            .max(200),
        })
        .strict()
        .parse(request.postDataJSON());
      const key = z.uuid().parse(headers["idempotency-key"]);
      state.bulks.push({ body, key });
      if (replay.has(key)) return json(replay.get(key));
      if (state.denyWrite) {
        state.role = "VIEWER";
        return problem(403, "FORBIDDEN");
      }
      const rows = body.payments.map((item) => state.payments.find((value) => value.id === item.paymentId));
      if (rows.some((value, index) => !value || value.version !== body.payments[index]?.expectedVersion))
        return problem(409, "VERSION_CONFLICT");
      const items = rows.map((value) => {
        if (!value) throw new Error("missing payment");
        Object.assign(value, {
          categoryCode: body.categoryCode,
          categorySource: "USER",
          version: value.version + 1,
        });
        return { ...value };
      });
      const result = { items };
      replay.set(key, result);
      if (state.dropBulk) {
        state.dropBulk = false;
        return route.abort("failed");
      }
      return json(result);
    }
    const value = state.payments.find(
      (item) => path === `${root}/payments/${item.id}` || path === `${root}/payments/${item.id}/category`,
    );
    if (value && method === "GET") {
      state.detailReads += 1;
      if (state.denyDetail) return problem(404, "NOT_FOUND");
      if (state.failDetail) return problem(503, "DEPENDENCY_UNAVAILABLE");
      return json({
        ...value,
        ...(state.wrongDetailScope ? { accountId: "00000000-0000-4000-8000-000000000099" } : {}),
      });
    }
    if (value && method === "PATCH") {
      const body = z.object({ categoryCode: z.string() }).strict().parse(request.postDataJSON());
      state.patches.push({ body, match: headers["if-match"] ?? "" });
      if (state.denyWrite) {
        state.role = "VIEWER";
        return problem(403, "FORBIDDEN");
      }
      if (headers["if-match"] !== `"${value.version}"`) return problem(409, "VERSION_CONFLICT");
      Object.assign(value, {
        categoryCode: body.categoryCode,
        categorySource: "USER",
        version: value.version + 1,
      });
      if (state.dropPatch) {
        state.dropPatch = false;
        return route.abort("failed");
      }
      return json(value);
    }
    state.problems.push(`unhandled ${method} ${path}`);
    return problem(404, "NOT_FOUND");
  });
  return state;
}
async function openFirst(page: Page) {
  await page
    .getByRole("button", { name: "Открыть операцию 2026-10-23 Поставщик из примера", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Операция выписки" }).getByLabel("Новая категория", { exact: true }),
  ).toBeEnabled();
}
async function selectOption(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function openBulk(page: Page) {
  await page.getByRole("checkbox", { name: "Выбрать все загруженные строки", exact: true }).check();
  await page.getByRole("button", { name: "Изменить категории выбранных", exact: true }).click();
  await selectOption(page, "Общая категория", "Переводы");
}

test("filters and counterparties use scoped server queries; applying filters and paging clears selection", async ({
  page,
}) => {
  const state = await service(page);
  state.morePages = true;
  await page.goto(screen);
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("checkbox", { name: "Выбрать строку 1", exact: true }).check();
  await selectOption(page, "Направление", "Списания");
  await selectOption(page, "Категория", "Аренда");
  await selectOption(page, "Порядок по дате", "Сначала старые");
  await page.getByLabel("Поиск по операциям", { exact: true }).fill("договор");
  await page.getByRole("button", { name: "Применить фильтры", exact: true }).click();
  await expect
    .poll(() => state.listQueries.at(-1))
    .toEqual({
      accountId,
      direction: "OUT",
      categoryCode: "RENT",
      q: "договор",
      sort: "operationDate,asc",
      page: "0",
      size: "25",
    });
  await expect(page.getByText(/Выбрано на странице: 0/)).toBeVisible();
  await page.getByLabel("Контрагент", { exact: true }).click();
  await page.getByRole("combobox", { name: "Поиск контрагента", exact: true }).fill("Поставщик");
  await expect.poll(() => state.counterpartyQueries.at(-1)?.q).toBe("Поставщик");
  await page.getByRole("option", { name: "Поставщик из примера · ИНН 0000000001", exact: true }).click();
  await page.getByRole("button", { name: "Применить фильтры", exact: true }).click();
  await expect.poll(() => state.listQueries.at(-1)?.counterpartyKey).toBe("inn:0000000001");
  await page.getByRole("checkbox", { name: "Выбрать строку 1", exact: true }).check();
  await page.getByRole("button", { name: "Далее", exact: true }).last().click();
  await expect(page.getByText("Следующая страница", { exact: true })).toBeVisible();
  await expect(page.getByText(/Выбрано на странице: 0/)).toBeVisible();
  await expect.poll(() => state.listQueries.at(-1)?.page).toBe("1");
  await page.getByRole("button", { name: "Сбросить фильтры", exact: true }).click();
  await expect(page.getByText("Поставщик из примера", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Обновить операции", exact: true }).click();
  await expect
    .poll(() => state.listQueries.at(-1))
    .toEqual({ accountId, sort: "operationDate,desc", page: "0", size: "25" });
  await page.getByLabel("Поиск по операциям", { exact: true }).fill("ничего");
  await page.getByRole("button", { name: "Применить фильтры", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Нет операций по фильтрам", exact: true })).toBeVisible();
  expect(state.problems).toEqual([]);
});

test("counterparty pages are server-scoped and retain the selected display name", async ({ page }) => {
  const state = await service(page);
  await page.goto(screen);
  const pages = page.getByLabel("Страницы поиска контрагента", { exact: true });
  await pages.getByRole("button", { name: "Далее", exact: true }).click();
  await expect.poll(() => state.counterpartyQueries.at(-1)).toEqual({ accountId, page: "1", size: "50" });
  await page.getByLabel("Контрагент", { exact: true }).click();
  await page.getByRole("option", { name: "Второй контрагент · ИНН 0000000002", exact: true }).click();
  await pages.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(pages.getByText("Страница 1 · Всего: 51", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Контрагент", { exact: true })).toHaveText(
    "Второй контрагент · ИНН 0000000002",
  );
  await page.getByRole("button", { name: "Применить фильтры", exact: true }).click();
  await expect.poll(() => state.listQueries.at(-1)?.counterpartyKey).toBe("inn:0000000002");
  expect(state.problems).toEqual([]);
});

test("single category PATCH uses quoted server version and changes no immutable fact", async ({ page }) => {
  const state = await service(page);
  await page.goto(screen);
  await openFirst(page);
  const dialog = page.getByRole("dialog");
  expect((await dialog.textContent())?.replace(/\s/gu, "")).toContain("99999999999999999,99₽");
  await expect(dialog.getByText("Остаток на конец дня: Нет данных", { exact: true })).toBeVisible();
  await expect(
    dialog.getByText("Оплата по договору <script>private</script>", { exact: false }),
  ).toBeVisible();
  await selectOption(page, "Новая категория", "Аренда");
  await page.getByRole("button", { name: "Сохранить категорию", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.patches).toEqual([{ body: { categoryCode: "RENT" }, match: '"1"' }]);
  expect(state.payments[0]?.amount).toBe("99999999999999999.99");
  expect(state.payments[0]?.operationDate).toBe("2026-10-23");
  expect(state.problems).toEqual([]);
});

test("PATCH conflict preserves selection, rereads and waits for explicit version adoption and a separate save", async ({
  page,
}) => {
  const state = await service(page);
  await page.goto(screen);
  await openFirst(page);
  await selectOption(page, "Новая категория", "Аренда");
  Object.assign(state.payments.at(0) ?? {}, { categoryCode: "TRANSFER", version: 7 });
  await page.getByRole("button", { name: "Сохранить категорию", exact: true }).click();
  await expect(page.getByText("Актуальная категория: Переводы", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Новая категория", { exact: true })).toHaveText("Аренда");
  await expect(page.getByRole("button", { name: "Сохранить категорию", exact: true })).toBeDisabled();
  expect(state.patches).toHaveLength(1);
  await page.getByRole("button", { name: "Оставить мой выбор", exact: true }).click();
  expect(state.patches).toHaveLength(1);
  await page.getByRole("button", { name: "Сохранить категорию", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.patches[1]).toEqual({ body: { categoryCode: "RENT" }, match: '"7"' });
});

test("a lost PATCH response is read before any further write and a failed reread cannot unlock the form", async ({
  page,
}) => {
  const state = await service(page);
  await page.goto(screen);
  await openFirst(page);
  await selectOption(page, "Новая категория", "Аренда");
  state.dropPatch = true;
  state.failDetail = true;
  await page.getByRole("button", { name: "Сохранить категорию", exact: true }).click();
  await expect(page.getByRole("button", { name: "Перечитать операцию", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Оставить мой выбор", exact: true })).toHaveCount(0);
  expect(state.patches).toHaveLength(1);
  expect(state.payments[0]?.version).toBe(2);
  state.failDetail = false;
  await page.getByRole("button", { name: "Перечитать операцию", exact: true }).click();
  await expect(page.getByText("Актуальная категория: Аренда", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Загрузить актуальную категорию", exact: true }).click();
  expect(state.patches).toHaveLength(1);
  await expect(page.getByLabel("Новая категория", { exact: true })).toHaveText("Аренда");
});

test("bulk lost response and subsequent rate limit retain exactly the same command key, versions and body", async ({
  page,
}) => {
  await page.clock.install();
  const state = await service(page);
  await page.goto(screen);
  await openBulk(page);
  state.dropBulk = true;
  await page.getByRole("button", { name: "Применить категорию", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить ту же команду", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Общая категория", { exact: true })).toBeDisabled();
  let limitedKey: string | undefined;
  await page.route(
    (url) => url.pathname === `${root}/payments/category-changes`,
    async (route) => {
      limitedKey = route.request().headers()["idempotency-key"];
      await route.fulfill({
        status: 429,
        headers: { "Retry-After": "2" },
        contentType: "application/problem+json",
        body: JSON.stringify({ status: 429, code: "RATE_LIMITED", detail: "private" }),
      });
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByRole("button", { name: /Повторить через/ })).toBeDisabled();
  expect(limitedKey).toBe(state.bulks[0]?.key);
  await page.clock.fastForward(2100);
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.bulks[1]).toEqual(state.bulks[0]);
  expect(state.payments.map((value) => value.version)).toEqual([2, 2]);
  expect(state.bulks[0]?.body).toEqual({
    categoryCode: "TRANSFER",
    payments: [
      { paymentId: firstId, expectedVersion: 1 },
      { paymentId: secondId, expectedVersion: 1 },
    ],
  });
  expect(state.problems).toEqual([]);
});

test("leaving an uncertain bulk command requires confirmation and rereads the changed facts", async ({
  page,
}) => {
  const state = await service(page);
  await page.goto(screen);
  await openBulk(page);
  state.dropBulk = true;
  await page.getByRole("button", { name: "Применить категорию", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить ту же команду", exact: true })).toBeEnabled();
  const reads = state.listQueries.length;
  await page.getByRole("button", { name: "Проверить операции", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Проверить результат в операциях?", exact: true });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Проверить операции", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => state.listQueries.length).toBeGreaterThan(reads);
  await expect(page.getByRole("table").getByText("Переводы", { exact: true })).toHaveCount(2);
  expect(state.bulks).toHaveLength(1);
});

test("atomic bulk conflict requires all current versions and a separate new command", async ({ page }) => {
  const state = await service(page);
  await page.goto(screen);
  await openBulk(page);
  Object.assign(state.payments.at(0) ?? {}, { version: 9 });
  await page.getByRole("button", { name: "Применить категорию", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Перечитать выбранные операции", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .locator("form")
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  expect(state.payments.map((value) => value.categoryCode)).toEqual(["OTHER", "OTHER"]);
  await page.getByRole("button", { name: "Перечитать выбранные операции", exact: true }).click();
  await page.getByRole("button", { name: "Принять актуальные данные", exact: true }).click();
  expect(state.bulks).toHaveLength(1);
  Object.assign(state.payments.at(0) ?? {}, { version: 11 });
  await page.getByRole("button", { name: "Применить категорию", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Перечитать выбранные операции", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Принять актуальные данные", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Перечитать выбранные операции", exact: true }).click();
  await page.getByRole("button", { name: "Принять актуальные данные", exact: true }).click();
  expect(state.bulks).toHaveLength(2);
  await page.getByRole("button", { name: "Применить категорию", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.bulks[1]?.key).not.toBe(state.bulks[0]?.key);
  expect(state.bulks[1]?.body.payments).toEqual([
    { paymentId: firstId, expectedVersion: 9 },
    { paymentId: secondId, expectedVersion: 1 },
  ]);
  expect(state.bulks[2]?.key).not.toBe(state.bulks[1]?.key);
  expect(state.bulks[2]?.body.payments).toEqual([
    { paymentId: firstId, expectedVersion: 11 },
    { paymentId: secondId, expectedVersion: 1 },
  ]);
});

for (const [role, archived] of [
  ["VIEWER", false],
  ["OWNER", true],
] as const) {
  test(`${role}, archived=${archived} can inspect facts but cannot change categories`, async ({ page }) => {
    const state = await service(page, role, archived);
    await page.goto(screen);
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Изменить категории выбранных", exact: true })).toHaveCount(
      0,
    );
    await page
      .getByRole("button", { name: "Открыть операцию 2026-10-23 Поставщик из примера", exact: true })
      .click();
    await expect(
      page.getByText("Назначение: Оплата по договору <script>private</script>", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Новая категория", { exact: true })).toHaveCount(0);
    expect(state.patches).toEqual([]);
    expect(state.bulks).toEqual([]);
  });
}

test("write-time role loss removes editing and never retries a rejected command", async ({ page }) => {
  const state = await service(page);
  await page.goto(screen);
  await openFirst(page);
  await selectOption(page, "Новая категория", "Аренда");
  state.denyWrite = true;
  await page.getByRole("button", { name: "Сохранить категорию", exact: true }).click();
  await expect(page.getByLabel("Новая категория", { exact: true })).toHaveCount(0);
  expect(state.patches).toHaveLength(1);
  expect(state.payments[0]?.categoryCode).toBe("OTHER");
  await expect(page.getByText("private-server-detail", { exact: false })).toHaveCount(0);
});

test("outage keeps saved facts read-only; denial hides cached operations and detail scopes are validated", async ({
  page,
}) => {
  const state = await service(page);
  await page.goto(screen);
  await expect(page.getByRole("table")).toBeVisible();
  state.failList = true;
  await page.getByRole("button", { name: "Обновить операции", exact: true }).click();
  await expect(page.getByText(/Показаны сохранённые данные/)).toBeVisible();
  await expect(page.getByText("Поставщик из примера", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  state.failList = false;
  state.denyList = true;
  await page.getByRole("button", { name: "Обновить операции", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Действие недоступно", exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByText("Поставщик из примера", { exact: true })).toHaveCount(0);
  state.denyList = false;
  await page.reload();
  await expect(page.getByRole("table")).toBeVisible();
  state.wrongDetailScope = true;
  await page
    .getByRole("button", { name: "Открыть операцию 2026-10-23 Поставщик из примера", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText(/Сервис вернул данные в неподдерживаемом формате/),
  ).toBeVisible();
  await expect(page.getByLabel("Новая категория", { exact: true })).toHaveCount(0);
  await expect(page.getByText("private-server-detail", { exact: false })).toHaveCount(0);
  expect(state.problems).toEqual([]);
});

test("a detail 404 hides previously cached metadata immediately", async ({ page }) => {
  const state = await service(page);
  await page.goto(screen);
  await openFirst(page);
  state.denyDetail = true;
  await page.getByRole("dialog").getByRole("button", { name: "Закрыть", exact: true }).click();
  await page
    .getByRole("button", { name: "Открыть операцию 2026-10-23 Поставщик из примера", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Нет доступа к ресурсу", exact: true })).toBeVisible();
  await expect(dialog.getByText(/Назначение:/)).toHaveCount(0);
  await expect(dialog.getByLabel("Новая категория", { exact: true })).toHaveCount(0);
  expect(state.patches).toEqual([]);
});

test("unknown direction/source stay unknown; invalid URL never reaches business API", async ({ page }) => {
  const state = await service(page);
  Object.assign(state.payments.at(0) ?? {}, { direction: "NEW_DIRECTION", categorySource: "NEW_SOURCE" });
  await page.goto(screen);
  await page
    .getByRole("button", { name: "Открыть операцию 2026-10-23 Поставщик из примера", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText("Источник категории: Неизвестен", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Новая категория", { exact: true })).toHaveCount(0);
  const before = state.requests.length;
  await page.goto("/app/payments?company=invalid&account=invalid");
  await expect(page.getByRole("heading", { name: "Выберите организацию и счёт", exact: true })).toBeVisible();
  expect(state.requests.slice(before).filter((value) => value.includes("orchestrator"))).toEqual([]);
});

for (const width of [360, 768, 1440])
  for (const theme of ["light", "dark"] as const) {
    test(`operations ${width}px ${theme}: keyboard, motion, exact values, layout and axe`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({
        colorScheme: theme,
        reducedMotion: width === 360 ? "reduce" : "no-preference",
      });
      const state = await service(page);
      await page.goto(screen);
      await expect(page.getByRole("table")).toBeVisible();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("link", { name: "Назад к бизнесу", exact: true })).toBeFocused();
      const first = await new AxeBuilder({ page }).analyze();
      await page.screenshot({
        path: `evidence/T-CLIENT-01-operations/list-${width}-${theme}.png`,
        fullPage: true,
      });
      await openFirst(page);
      const dialog = page.getByRole("dialog");
      expect((await dialog.textContent())?.replace(/\s/gu, "")).toContain("99999999999999999,99₽");
      await page.getByLabel("Новая категория", { exact: true }).focus();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("option", { name: "Продажи", exact: true })).toHaveCount(0);
      await page.keyboard.press("Escape");
      const second = await new AxeBuilder({ page }).analyze();
      await page.screenshot({
        path: `evidence/T-CLIENT-01-operations/detail-${width}-${theme}.png`,
        fullPage: false,
      });
      await dialog.getByRole("button", { name: "Закрыть", exact: true }).click();
      await openBulk(page);
      const third = await new AxeBuilder({ page }).analyze();
      await page.screenshot({
        path: `evidence/T-CLIENT-01-operations/bulk-${width}-${theme}.png`,
        fullPage: false,
      });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
      expect(
        [...first.violations, ...second.violations, ...third.violations].filter(
          (value) => value.impact === "serious" || value.impact === "critical",
        ),
      ).toEqual([]);
      expect(state.problems).toEqual([]);
    });
  }

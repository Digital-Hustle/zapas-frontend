import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";

const root = "/api/v1/orchestrator/companies";
const userId = "00000000-0000-4000-8000-000000000010";
const companyId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const accountId = "00000000-0000-4000-8000-000000000003";
const time = "2026-10-24T09:00:00Z";
function company(id = companyId, role = "OWNER", archived = false) {
  return {
    id,
    name: id === companyId ? "Первая компания" : "Вторая компания",
    legalForm: "OOO",
    inn: null as string | null,
    kpp: null as string | null,
    timezone: "Europe/Moscow",
    ownerUserId: userId,
    myRole: role,
    permissions: {
      canEditCompany: role === "OWNER",
      canManageMembers: role === "OWNER",
      canImport: role !== "VIEWER",
      canEditPayments: role !== "VIEWER",
      canManagePlans: role !== "VIEWER",
      canRunForecast: role !== "VIEWER",
      canRunBacktest: role !== "VIEWER",
    },
    archived,
    dataVersion: 0,
    version: 1,
    createdAt: time,
    updatedAt: time,
  };
}
function account(id = accountId, scope = companyId) {
  return {
    id,
    companyId: scope,
    name: "Основной счёт",
    bankName: "Банк из примера" as string | null,
    accountNumber: "00000000000000000001" as string | null,
    externalCompanyId: null as string | null,
    currency: "RUB",
    archived: false,
    latestBalance: "-99999999999999999.99" as string | null,
    latestBalanceDate: "2026-10-24" as string | null,
    version: 1,
  };
}
async function service(page: Page, seed = false, role = "OWNER", archived = false) {
  const state = {
    companies: seed
      ? [company(companyId, role, archived), company(secondId, "VIEWER")]
      : ([] as ReturnType<typeof company>[]),
    accounts: seed
      ? [
          account(),
          {
            ...account("00000000-0000-4000-8000-000000000004", secondId),
            name: "Второй счёт",
            latestBalance: null,
            latestBalanceDate: null,
          },
        ]
      : ([] as ReturnType<typeof account>[]),
    failList: false,
    denyCompany: false,
    dropCompanyResponse: false,
    listCalls: 0,
    companyPosts: [] as { body: unknown; key: string }[],
    accountPosts: [] as { body: unknown; key: string }[],
    companyPuts: [] as { body: unknown; match: string }[],
    accountPuts: [] as { body: unknown; match: string }[],
    archivePosts: [] as { path: string; key: string; match: string }[],
    anchorPosts: [] as { body: unknown; key: string }[],
    dropAccountPut: false,
    dropArchiveResponse: false,
    dropAnchorResponse: false,
    failConflictRead: false,
    denyWrite: false,
    requests: [] as string[],
    problems: [] as string[],
  };
  const commands = new Map<string, ReturnType<typeof company>>();
  const managementCommands = new Map<string, unknown>();
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const headers = request.headers();
    state.requests.push(`${method} ${path}`);
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    const problem = (status: number, code: string) =>
      json(
        {
          type: "about:blank",
          title: "Request failed",
          status,
          code,
          detail: "private-server-detail",
          traceId: "fixture",
          errors: [],
          retryAfterSec: null,
          resourceId: null,
        },
        status,
      );
    const paged = (items: unknown[]) => {
      const number = Number(url.searchParams.get("page") ?? "0");
      return json({
        items: items.slice(number * 10, (number + 1) * 10),
        page: { page: number, size: 10, total: items.length, hasNext: (number + 1) * 10 < items.length },
      });
    };
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
    if (method !== "GET" && headers["x-csrf-token"] !== "modeled-csrf")
      state.problems.push("missing CSRF binding");
    if (path === root && method === "GET") {
      state.listCalls += 1;
      return state.failList ? problem(503, "DEPENDENCY_UNAVAILABLE") : paged(state.companies);
    }
    if (path === root && method === "POST") {
      const key = z.uuid().parse(headers["idempotency-key"]);
      const raw: unknown = request.postDataJSON();
      const body = z
        .object({
          name: z.string(),
          legalForm: z.string(),
          inn: z.string().nullable(),
          kpp: z.string().nullable(),
          timezone: z.literal("Europe/Moscow"),
        })
        .strict()
        .parse(raw);
      state.companyPosts.push({ key, body });
      const replay = commands.get(key);
      if (replay) return json(replay);
      const created = { ...company(crypto.randomUUID()), ...body };
      commands.set(key, created);
      state.companies.push(created);
      if (state.dropCompanyResponse) {
        state.dropCompanyResponse = false;
        return route.abort("failed");
      }
      return json(created, 201);
    }
    const parts = path.slice(root.length).split("/").filter(Boolean);
    const scope = state.companies.find(({ id }) => id === parts[0]);
    if (scope && parts.length === 1 && method === "GET")
      return state.denyCompany
        ? problem(404, "NOT_FOUND")
        : state.failConflictRead
          ? problem(503, "DEPENDENCY_UNAVAILABLE")
          : json(scope);
    if (scope && method === "PUT" && parts.length === 1) {
      const body = z
        .object({
          name: z.string(),
          legalForm: z.string(),
          inn: z.string().nullable(),
          kpp: z.string().nullable(),
          timezone: z.literal("Europe/Moscow"),
        })
        .strict()
        .parse(request.postDataJSON());
      state.companyPuts.push({ body, match: headers["if-match"] ?? "" });
      if (scope.myRole !== "OWNER") return problem(403, "FORBIDDEN");
      if (headers["if-match"] !== `"${scope.version}"`) return problem(409, "VERSION_CONFLICT");
      Object.assign(scope, body, { version: scope.version + 1 });
      return json(scope);
    }
    if (scope && parts[1] === "accounts" && parts.length === 2 && method === "GET")
      return paged(state.accounts.filter(({ companyId: id }) => id === scope.id));
    if (scope && parts[1] === "accounts" && parts.length === 2 && method === "POST") {
      if (scope.myRole === "VIEWER" || scope.archived) return problem(403, "FORBIDDEN");
      const key = z.uuid().parse(headers["idempotency-key"]);
      const raw: unknown = request.postDataJSON();
      const body = z
        .object({
          name: z.string(),
          bankName: z.string().nullable(),
          accountNumber: z.string().nullable(),
          externalCompanyId: z.string().nullable(),
        })
        .strict()
        .parse(raw);
      state.accountPosts.push({ key, body });
      const created = {
        ...account(crypto.randomUUID(), scope.id),
        ...body,
        latestBalance: null,
        latestBalanceDate: null,
      };
      state.accounts.push(created);
      return json(created, 201);
    }
    if (scope && parts[1] === "accounts" && parts.length === 3) {
      const value = state.accounts.find(
        ({ id, companyId: company }) => id === parts[2] && company === scope.id,
      );
      if (!value) return problem(404, "NOT_FOUND");
      if (method === "GET")
        return state.failConflictRead ? problem(503, "DEPENDENCY_UNAVAILABLE") : json(value);
      if (method === "PUT") {
        const body = z
          .object({
            name: z.string(),
            bankName: z.string().nullable(),
            accountNumber: z.string().nullable(),
            externalCompanyId: z.string().nullable(),
          })
          .strict()
          .parse(request.postDataJSON());
        state.accountPuts.push({ body, match: headers["if-match"] ?? "" });
        if (state.denyWrite) {
          scope.myRole = "VIEWER";
          scope.permissions.canEditCompany = false;
          return problem(403, "FORBIDDEN");
        }
        if (headers["if-match"] !== `"${value.version}"`) return problem(409, "VERSION_CONFLICT");
        Object.assign(value, body, { version: value.version + 1 });
        if (state.dropAccountPut) {
          state.dropAccountPut = false;
          return route.abort("failed");
        }
        return json(value);
      }
    }
    if (scope && method === "POST" && parts.at(-1) === "archive") {
      const value =
        parts.length === 2
          ? scope
          : state.accounts.find(({ id, companyId }) => id === parts[2] && companyId === scope.id);
      if (!value) return problem(404, "NOT_FOUND");
      const key = z.uuid().parse(headers["idempotency-key"]);
      state.archivePosts.push({ path, key, match: headers["if-match"] ?? "" });
      if (scope.myRole !== "OWNER") return problem(403, "FORBIDDEN");
      const replay = managementCommands.get(`${path}:${key}`);
      if (replay) return json(replay);
      if (headers["if-match"] !== `"${value.version}"`) return problem(409, "VERSION_CONFLICT");
      Object.assign(value, { archived: true, version: value.version + 1 });
      managementCommands.set(`${path}:${key}`, { ...value });
      if (state.dropArchiveResponse) {
        state.dropArchiveResponse = false;
        return route.abort("failed");
      }
      return json(value);
    }
    if (scope && method === "POST" && parts.at(-1) === "balance-anchors") {
      const value = state.accounts.find(({ id, companyId }) => id === parts[2] && companyId === scope.id);
      if (!value) return problem(404, "NOT_FOUND");
      const key = z.uuid().parse(headers["idempotency-key"]);
      const body = z
        .object({ date: z.iso.date(), balance: z.string(), reason: z.string() })
        .strict()
        .parse(request.postDataJSON());
      state.anchorPosts.push({ body, key });
      const replay = managementCommands.get(`${path}:${key}`);
      if (replay) return json(replay);
      const anchor = {
        id: crypto.randomUUID(),
        accountId: value.id,
        ...body,
        source: "MANUAL",
        createdAt: time,
      };
      managementCommands.set(`${path}:${key}`, anchor);
      if (value.latestBalanceDate === null || body.date >= value.latestBalanceDate)
        Object.assign(value, { latestBalance: body.balance, latestBalanceDate: body.date });
      if (state.dropAnchorResponse) {
        state.dropAnchorResponse = false;
        return route.abort("failed");
      }
      return json(anchor, 201);
    }
    state.problems.push(`unexpected endpoint ${method} ${path}`);
    return problem(404, "NOT_FOUND");
  });
  return state;
}
async function audit(page: Page) {
  await expect(page.locator('button[aria-busy="true"]')).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator("button:not(:disabled) > span")
        .evaluateAll((elements) => elements.every((element) => getComputedStyle(element).opacity === "1")),
    )
    .toBe(true);
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
}
async function settledDialog(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) => ({
        opacity: getComputedStyle(element).opacity,
        animations: element
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length,
      })),
    )
    .toEqual({ opacity: "1", animations: 0 });
  return dialog;
}

for (const width of [360, 768, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`workspace ${width}px ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: "reduce" });
      test("empty, company/account creation, explicit scope and accessible dialogs", async ({
        page,
      }, testInfo) => {
        const state = await service(page);
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto("/app");
        await expect(page.getByRole("heading", { name: "У вас пока нет организаций" })).toBeVisible();
        await page.getByRole("button", { name: "Создать организацию", exact: true }).click();
        let dialog = await settledDialog(page);
        await page.getByLabel("Название организации", { exact: true }).fill("Компания из примера");
        await page.getByRole("combobox", { name: "Правовая форма", exact: true }).click();
        await page.getByRole("option", { name: "ИП", exact: true }).click();
        await page.getByLabel("ИНН", { exact: true }).fill("001234567890");
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`company-form-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await dialog.getByRole("button", { name: "Создать организацию", exact: true }).focus();
        await page.keyboard.press("Enter");
        await expect(
          page.getByRole("heading", { name: "У организации пока нет счетов", exact: true }),
        ).toBeVisible();
        expect(state.companyPosts).toHaveLength(1);
        expect(state.companyPosts[0]?.body).toEqual({
          name: "Компания из примера",
          legalForm: "IP",
          inn: "001234567890",
          kpp: null as string | null,
          timezone: "Europe/Moscow",
        });
        await page.getByRole("button", { name: "Добавить счёт", exact: true }).click();
        dialog = await settledDialog(page);
        await page.getByLabel("Название счёта", { exact: true }).fill("Рабочий счёт");
        await page.getByLabel("Номер счёта", { exact: true }).fill("00000000000000000001");
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`account-form-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await dialog.getByRole("button", { name: "Добавить счёт", exact: true }).click({ clickCount: 2 });
        await expect(
          page.getByRole("heading", { name: "Выбранный счёт: Рабочий счёт", exact: true }),
        ).toBeVisible();
        await expect(page.getByText("Подтверждённый остаток пока не задан.", { exact: true })).toBeVisible();
        expect(state.accountPosts).toHaveLength(1);
        expect(state.accountPosts[0]?.body).toEqual({
          name: "Рабочий счёт",
          bankName: null,
          accountNumber: "00000000000000000001" as string | null,
          externalCompanyId: null,
        });
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`workspace-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(state.problems).toEqual([]);
        expect(errors).toEqual([]);
      });
    });
  }
}

test("lost POST response replays the same request and key without creating a second company", async ({
  page,
}) => {
  const state = await service(page);
  state.dropCompanyResponse = true;
  await page.goto("/app");
  await page.getByRole("button", { name: "Создать организацию", exact: true }).click();
  await page.getByLabel("Название организации", { exact: true }).fill("Сохранённая команда");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Создать организацию", exact: true })
    .click({ clickCount: 2 });
  await expect(page.getByRole("button", { name: "Повторить отправку", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Название организации", { exact: true })).toBeDisabled();
  expect(state.companies).toHaveLength(1);
  expect(state.companyPosts).toHaveLength(1);
  await page.getByRole("button", { name: "Вернуться к списку", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "Проверить результат в списке?", exact: true });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Отмена", exact: true }).click();
  await page.getByRole("button", { name: "Повторить отправку", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Счета: Сохранённая команда", exact: true })).toBeVisible();
  expect(state.companies).toHaveLength(1);
  expect(state.companyPosts).toHaveLength(2);
  expect(state.companyPosts[1]).toEqual(state.companyPosts[0]);
  expect(state.problems).toEqual([]);
});

test("a rate limit after a lost response keeps the original command until the explicit replay succeeds", async ({
  page,
}) => {
  await page.clock.install();
  const state = await service(page);
  state.dropCompanyResponse = true;
  await page.goto("/app");
  await page.getByRole("button", { name: "Создать организацию", exact: true }).click();
  await page.getByLabel("Название организации", { exact: true }).fill("Проверка повтора");
  await page.getByRole("dialog").getByRole("button", { name: "Создать организацию", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить отправку", exact: true })).toBeEnabled();
  let limitedKey: string | undefined;
  await page.route(
    (url) => url.pathname === root,
    async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
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
  await page.getByRole("button", { name: "Повторить отправку", exact: true }).click();
  await expect(page.getByRole("button", { name: /Повторить через/ })).toBeDisabled();
  expect(limitedKey).toBe(state.companyPosts[0]?.key);
  await page.clock.fastForward(2100);
  await page.getByRole("button", { name: "Повторить отправку", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Счета: Проверка повтора", exact: true })).toBeVisible();
  expect(state.companyPosts[1]).toEqual(state.companyPosts[0]);
  expect(state.companies).toHaveLength(1);
});

test("switching company clears account selection and preserves exact negative balance strings", async ({
  page,
}) => {
  const state = await service(page, true);
  await page.goto(`/app?company=${companyId}&account=${accountId}`);
  const selected = page.getByRole("region", { name: "Выбранный счёт: Основной счёт", exact: true });
  await expect(selected).toBeVisible();
  expect((await selected.textContent())?.replace(/\s/gu, "")).toContain("−99999999999999999,99₽");
  await page.getByRole("button", { name: "Выбрать организацию Вторая компания", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`company=${secondId}$`));
  await expect(page.getByRole("heading", { name: "Второй счёт", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Выбранный счёт: Основной счёт", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Добавить счёт", exact: true })).toHaveCount(0);
  expect(state.problems).toEqual([]);
});

for (const [role, archived] of [
  ["VIEWER", false],
  ["OWNER", true],
] as const) {
  test(`${role}, archive=${archived} is read-only`, async ({ page }) => {
    const state = await service(page, true, role, archived);
    await page.goto(`/app?company=${companyId}`);
    await expect(page.getByRole("heading", { name: "Основной счёт", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить счёт", exact: true })).toHaveCount(0);
    expect(state.accountPosts).toHaveLength(0);
  });
}

test("outage preserves cached lists; resource 404 and malformed scope do not reveal another account", async ({
  page,
}) => {
  const state = await service(page, true);
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Первая компания", exact: true })).toBeVisible();
  state.failList = true;
  await page.getByRole("button", { name: "Обновить организации", exact: true }).click();
  await expect(page.getByText(/Показаны сохранённые данные/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Первая компания", exact: true })).toBeVisible();
  expect(state.listCalls).toBe(2);
  state.failList = false;
  state.denyCompany = true;
  await page.goto(`/app?company=${companyId}&account=${accountId}`);
  await expect(page.getByRole("heading", { name: "Нет доступа к ресурсу", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Выбранный счёт: Основной счёт", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("private-server-detail")).toHaveCount(0);
  await page.goto("/app?company=invalid&account=invalid");
  await expect(page.getByRole("heading", { name: "Некорректная ссылка", exact: true })).toBeVisible();
  expect(state.requests.some((path) => path.includes("/invalid"))).toBe(false);
  expect(state.problems).toEqual([]);
});

test("switching company aborts its unfinished account request and rejects the late response", async ({
  page,
}) => {
  const state = await service(page, true);
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started: () => void = () => undefined;
  const waiting = new Promise<void>((resolve) => {
    started = resolve;
  });
  const path = `${root}/${companyId}/accounts`;
  await page.route(
    (url) => url.pathname === path,
    async (route) => {
      started();
      await gate;
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ items: [account()], page: { page: 0, size: 10, total: 1, hasNext: false } }),
      });
    },
  );
  await page.goto("/app");
  await page.getByRole("button", { name: "Выбрать организацию Первая компания", exact: true }).click();
  await waiting;
  const aborted = page.waitForEvent("requestfailed", (request) => new URL(request.url()).pathname === path);
  await page.getByRole("button", { name: "Выбрать организацию Вторая компания", exact: true }).click();
  await aborted;
  await expect(page.getByRole("heading", { name: "Второй счёт", exact: true })).toBeVisible();
  release();
  await expect(page.getByRole("heading", { name: "Основной счёт", exact: true })).toHaveCount(0);
  expect(state.problems).toEqual([]);
});

test("company pagination uses server pages without carrying old cards into the next page", async ({
  page,
}) => {
  const state = await service(page);
  state.companies = Array.from({ length: 12 }, (_, index) => ({
    ...company(`00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
    name: `Организация ${index + 1}`,
  }));
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Организация 1", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Далее", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Организация 11", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Организация 1", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Далее", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Организация 1", exact: true })).toBeVisible();
  expect(state.problems).toEqual([]);
});

async function selectAnchorDate(page: Page, day = 24) {
  await page.getByRole("button", { name: "Дата остатка", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(`^.*${day} октября`) }).click();
}
async function settledToasts(page: Page) {
  await page.mouse.move(0, 0);
  await expect(page.getByRole("button", { name: "Закрыть уведомление", exact: true })).toHaveCount(0, {
    timeout: 7000,
  });
}
const selectedScope = `/app?company=${companyId}&account=${accountId}`;
for (const width of [360, 768, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`management ${width}px ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: "reduce" });
      test("edits full requisites, records exact signed balance and archives with keyboard", async ({
        page,
      }, testInfo) => {
        await page.clock.setFixedTime(new Date(time));
        const state = await service(page, true);
        await page.goto(selectedScope);
        await page.getByRole("button", { name: "Редактировать организацию", exact: true }).click();
        let dialog = await settledDialog(page);
        await page.getByLabel("Название организации", { exact: true }).fill("Обновлённая компания");
        await page.getByLabel("ИНН", { exact: true }).fill("001234567890");
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`company-edit-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await dialog.getByRole("button", { name: "Сохранить изменения", exact: true }).focus();
        await page.keyboard.press("Enter");
        await expect(dialog).not.toBeVisible();
        expect(state.companyPuts).toEqual([
          {
            match: '"1"',
            body: {
              name: "Обновлённая компания",
              legalForm: "OOO",
              inn: "001234567890",
              kpp: null,
              timezone: "Europe/Moscow",
            },
          },
        ]);
        await page.getByRole("button", { name: "Редактировать счёт", exact: true }).click();
        dialog = await settledDialog(page);
        await page.getByLabel("Название счёта", { exact: true }).fill("Расчётный счёт");
        await page.getByLabel("Банк", { exact: true }).fill("");
        await page.getByLabel("ID компании в выписке", { exact: true }).fill("C001");
        await audit(page);
        await dialog
          .getByRole("button", { name: "Сохранить изменения", exact: true })
          .click({ clickCount: 2 });
        await expect(dialog).not.toBeVisible();
        expect(state.accountPuts).toEqual([
          {
            match: '"1"',
            body: {
              name: "Расчётный счёт",
              bankName: null,
              accountNumber: "00000000000000000001",
              externalCompanyId: "C001",
            },
          },
        ]);
        await settledToasts(page);
        await page.getByRole("button", { name: "Указать остаток", exact: true }).click();
        dialog = await settledDialog(page);
        await selectAnchorDate(page);
        await page.getByLabel("Остаток, ₽", { exact: true }).fill("-99999999999999999.99");
        await page.getByLabel("Основание", { exact: true }).fill("Сверено с банком");
        await page.getByLabel("Основание", { exact: true }).press("Tab");
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`balance-form-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await dialog.getByRole("button", { name: "Сохранить остаток", exact: true }).click({ clickCount: 2 });
        await expect(
          dialog.getByText("Сохранён ручной остаток на 2026-10-24.", { exact: true }),
        ).toBeVisible();
        expect(state.anchorPosts).toHaveLength(1);
        expect(state.anchorPosts[0]?.body).toEqual({
          date: "2026-10-24",
          balance: "-99999999999999999.99",
          reason: "Сверено с банком",
        });
        expect(await dialog.innerText()).toContain("−99 999 999 999 999 999,99");
        await audit(page);
        await dialog.getByRole("button", { name: "Готово", exact: true }).focus();
        await page.keyboard.press("Enter");
        await settledToasts(page);
        await page.getByRole("button", { name: "Архивировать счёт", exact: true }).click();
        dialog = await settledDialog(page);
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`archive-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await dialog.getByRole("button", { name: "Архивировать", exact: true }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByText("Счёт в архиве. Доступен просмотр.", { exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Редактировать счёт", exact: true })).toHaveCount(0);
        expect(state.archivePosts[0]?.match).toBe('"2"');
        expect(state.problems).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      });
    });
  }
}

test("version conflict preserves draft and requires a choice and a separate save", async ({ page }) => {
  const state = await service(page, true);
  await page.goto(selectedScope);
  await page.getByRole("button", { name: "Редактировать организацию", exact: true }).click();
  await page.getByLabel("Название организации", { exact: true }).fill("Мой вариант");
  Object.assign(state.companies[0] ?? {}, { name: "Изменено другой сессией", inn: "0099999999", version: 7 });
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByText("Изменено другой сессией · OOO", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Название организации", { exact: true })).toHaveValue("Мой вариант");
  await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeDisabled();
  expect(state.companyPuts).toHaveLength(1);
  await page.getByRole("button", { name: "Оставить мой вариант", exact: true }).click();
  expect(state.companyPuts).toHaveLength(1);
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(state.companyPuts.map(({ match }) => match)).toEqual(['"1"', '"7"']);
  expect(state.companies[0]?.name).toBe("Мой вариант");
  expect(state.problems).toEqual([]);
});

test("lost PUT response reads the current account and never blindly retries", async ({ page }) => {
  const state = await service(page, true);
  state.dropAccountPut = true;
  await page.goto(selectedScope);
  await page.getByRole("button", { name: "Редактировать счёт", exact: true }).click();
  await page.getByLabel("Название счёта", { exact: true }).fill("Сохранённый, но ответ потерян");
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByText("Актуальные реквизиты:", { exact: true })).toBeVisible();
  expect(state.accountPuts).toHaveLength(1);
  await expect(page.getByRole("button", { name: "Сохранить изменения", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Загрузить актуальные данные", exact: true }).click();
  await expect(page.getByLabel("Название счёта", { exact: true })).toHaveValue(
    "Сохранённый, но ответ потерян",
  );
  expect(state.accountPuts).toHaveLength(1);
  await page.getByLabel("Название счёта", { exact: true }).fill("Ещё одна явная правка");
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(state.accountPuts.map(({ match }) => match)).toEqual(['"1"', '"2"']);
});

test("conflict read outage retains the draft and prevents writes until a successful read", async ({
  page,
}) => {
  const state = await service(page, true);
  await page.goto(selectedScope);
  await page.getByRole("button", { name: "Редактировать счёт", exact: true }).click();
  await page.getByLabel("Название счёта", { exact: true }).fill("Не потерять");
  Object.assign(state.accounts[0] ?? {}, { version: 9 });
  state.failConflictRead = true;
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(
    page.getByText("Сервис временно недоступен. Попробуйте позже.", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Название счёта", { exact: true })).toHaveValue("Не потерять");
  await expect(page.getByRole("button", { name: "Оставить мой вариант", exact: true })).toHaveCount(0);
  state.failConflictRead = false;
  await page.getByRole("button", { name: "Перечитать данные", exact: true }).click();
  await page.getByRole("button", { name: "Оставить мой вариант", exact: true }).click();
  expect(state.accountPuts).toHaveLength(1);
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(state.accountPuts.at(-1)?.match).toBe('"9"');
});

test("archive lost response replays the original key and version before checking the new version", async ({
  page,
}) => {
  const state = await service(page, true);
  state.dropArchiveResponse = true;
  await page.goto(selectedScope);
  await page.getByRole("button", { name: "Архивировать счёт", exact: true }).click();
  await page.getByRole("button", { name: "Архивировать", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить отправку", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Повторить отправку", exact: true }).click();
  await expect(page.getByText("Счёт в архиве. Доступен просмотр.", { exact: true })).toBeVisible();
  expect(state.archivePosts).toHaveLength(2);
  expect(state.archivePosts[1]).toEqual(state.archivePosts[0]);
});

test("archive version conflict requires reread, explicit adoption and a new confirmed command", async ({
  page,
}) => {
  const state = await service(page, true);
  await page.goto(selectedScope);
  await page.getByRole("button", { name: "Архивировать организацию", exact: true }).click();
  Object.assign(state.companies[0] ?? {}, { version: 5 });
  await page.getByRole("button", { name: "Архивировать", exact: true }).click();
  await expect(page.getByRole("button", { name: "Архивировать", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Перечитать перед архивированием", exact: true }).click();
  await page.getByRole("button", { name: "Использовать актуальную версию", exact: true }).click();
  expect(state.archivePosts).toHaveLength(1);
  await page.getByRole("button", { name: "Архивировать", exact: true }).click();
  await expect(
    page.getByText("Организация в архиве. Доступен просмотр сохранённых данных.", { exact: true }),
  ).toBeVisible();
  expect(state.archivePosts.map(({ match }) => match)).toEqual(['"1"', '"5"']);
  expect(state.archivePosts[1]?.key).not.toBe(state.archivePosts[0]?.key);
});

test("balance anchor lost response preserves exact payload and never replaces latest balance with an older anchor", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page, true);
  state.dropAnchorResponse = true;
  await page.goto(selectedScope);
  await page.getByRole("button", { name: "Указать остаток", exact: true }).click();
  await selectAnchorDate(page, 20);
  await page.getByLabel("Остаток, ₽", { exact: true }).fill("0");
  await page.getByLabel("Основание", { exact: true }).fill("Сверка на прошлую дату");
  await page.getByRole("button", { name: "Сохранить остаток", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить отправку", exact: true })).toBeVisible();
  await expect(page.getByLabel("Остаток, ₽", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Повторить отправку", exact: true }).click();
  await expect(page.getByText("Сохранён ручной остаток на 2026-10-20.", { exact: true })).toBeVisible();
  expect(state.anchorPosts).toHaveLength(2);
  expect(state.anchorPosts[1]).toEqual(state.anchorPosts[0]);
  expect(state.anchorPosts[0]?.body).toEqual({
    date: "2026-10-20",
    balance: "0.00",
    reason: "Сверка на прошлую дату",
  });
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  const selected = page.getByRole("region", { name: "Выбранный счёт: Основной счёт", exact: true });
  await expect(selected).toContainText("−99 999 999 999 999 999,99");
  expect(state.problems).toEqual([]);
});

for (const role of ["VIEWER", "ACCOUNTANT"]) {
  test(`management respects ${role} scope and does not offer OWNER commands`, async ({ page }) => {
    const state = await service(page, true, role);
    await page.goto(selectedScope);
    await expect(
      page.getByRole("heading", { name: "Выбранный счёт: Основной счёт", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Редактировать организацию", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Архивировать организацию", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Архивировать счёт", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Редактировать счёт", exact: true })).toHaveCount(
      role === "ACCOUNTANT" ? 1 : 0,
    );
    await expect(page.getByRole("button", { name: "Указать остаток", exact: true })).toHaveCount(
      role === "ACCOUNTANT" ? 1 : 0,
    );
    expect(state.problems).toEqual([]);
  });
}

test("a write 403 refreshes company permissions and hides further write controls", async ({ page }) => {
  const state = await service(page, true);
  await page.goto(selectedScope);
  await page.getByRole("button", { name: "Редактировать счёт", exact: true }).click();
  await page.getByLabel("Название счёта", { exact: true }).fill("Не разрешено");
  state.denyWrite = true;
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Редактировать счёт", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Указать остаток", exact: true })).toHaveCount(0);
  expect(state.accountPuts).toHaveLength(1);
});

test("anchor form rejects a missing amount and future date before sending a command", async ({ page }) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page, true);
  await page.goto(selectedScope);
  await page.getByRole("button", { name: "Указать остаток", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить остаток", exact: true }).click();
  await expect(page.getByLabel("Остаток, ₽", { exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(state.anchorPosts).toHaveLength(0);
  await selectAnchorDate(page, 25);
  await page.getByLabel("Остаток, ₽", { exact: true }).fill("12,34");
  await page.getByLabel("Основание", { exact: true }).fill("Сверка");
  await page.getByRole("button", { name: "Сохранить остаток", exact: true }).click();
  await expect(page.getByText("Будущая дата остатка недопустима", { exact: true })).toBeVisible();
  expect(state.anchorPosts).toHaveLength(0);
  await selectAnchorDate(page);
  await page.getByRole("button", { name: "Сохранить остаток", exact: true }).click();
  await expect(page.getByText("Сохранён ручной остаток на 2026-10-24.", { exact: true })).toBeVisible();
  expect(state.anchorPosts[0]?.body).toEqual({ date: "2026-10-24", balance: "12.34", reason: "Сверка" });
});

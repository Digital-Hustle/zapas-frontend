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
    requests: [] as string[],
    problems: [] as string[],
  };
  const commands = new Map<string, ReturnType<typeof company>>();
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
      return state.denyCompany ? problem(404, "NOT_FOUND") : json(scope);
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
      return value ? json(value) : problem(404, "NOT_FOUND");
    }
    state.problems.push(`unexpected endpoint ${method} ${path}`);
    return problem(404, "NOT_FOUND");
  });
  return state;
}
async function audit(page: Page) {
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

import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const companyId = "00000000-0000-4000-8000-000000000001";
const accountId = "00000000-0000-4000-8000-000000000003";
const instant = "2026-10-24T09:00:00Z";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const permissions = {
      canEditCompany: true,
      canManageMembers: true,
      canImport: true,
      canEditPayments: true,
      canManagePlans: true,
      canRunForecast: true,
      canRunBacktest: true,
    };
    const company = {
      id: companyId,
      name: "Мой бизнес",
      legalForm: "OOO",
      inn: null,
      kpp: null,
      timezone: "Europe/Moscow",
      ownerUserId: companyId,
      myRole: "OWNER",
      permissions,
      archived: false,
      dataVersion: 1,
      version: 1,
      createdAt: instant,
      updatedAt: instant,
    };
    const account = {
      id: accountId,
      companyId,
      name: "Основной счёт",
      bankName: null,
      accountNumber: null,
      externalCompanyId: null,
      currency: "RUB",
      archived: false,
      latestBalance: null,
      latestBalanceDate: null,
      version: 1,
    };
    const paged = (items: unknown[]) => ({
      items,
      page: { page: 0, size: 10, total: items.length, hasNext: false },
    });
    let body: unknown;
    if (path === "/api/v1/auth-profile/profile/me")
      body = {
        id: companyId,
        email: "owner@example.test",
        displayName: null,
        version: 0,
        createdAt: instant,
        updatedAt: instant,
      };
    else if (path === "/api/v1/orchestrator/companies") body = paged([company]);
    else if (path.endsWith(`/companies/${companyId}`)) body = company;
    else if (path.endsWith("/accounts")) body = paged([account]);
    else if (path.endsWith(`/accounts/${accountId}`)) body = account;
    else body = paged([]);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
});

test("opening a company leaves the list and exposes import and return navigation", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Выбрать организацию Мой бизнес" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/company/${companyId}`));
  await expect(page.getByRole("heading", { name: "Ваши организации" })).toHaveCount(0);
  await page.getByRole("button", { name: "Выбрать счёт Основной счёт" }).click();
  await page.getByRole("link", { name: "История и импорт CSV", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/imports\?/);
  await page.getByRole("link", { name: "Назад к бизнесу", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/app/company/${companyId}`));
  await page.getByRole("link", { name: "Назад к организациям", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
});

for (const width of [360, 768, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`business navigation ${width} ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: "reduce" });
      test("legacy links resolve to a separate reloadable company page", async ({ page }, info) => {
        await page.goto(`/app?company=${companyId}&account=${accountId}`);
        await expect(page).toHaveURL(new RegExp(`/app/company/${companyId}\\?account=${accountId}$`));
        await expect(page.getByRole("heading", { name: "Мой бизнес", exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Ваши организации" })).toHaveCount(0);
        await page.reload();
        await expect(page.getByRole("heading", { name: "Выбранный счёт: Основной счёт" })).toBeVisible();
        await page.getByRole("link", { name: "Назад к организациям", exact: true }).focus();
        await expect(page.getByRole("link", { name: "Назад к организациям", exact: true })).toBeFocused();
        const result = await new AxeBuilder({ page }).analyze();
        expect(
          result.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
        ).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: info.outputPath(`business-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/app$/);
      });
    });
  }
}

test("a new forbidden read hides the cached company name and account details", async ({ page }) => {
  await page.goto(`/app/company/${companyId}?account=${accountId}`);
  await expect(page.getByRole("heading", { name: "Мой бизнес", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "История и импорт CSV", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/imports/);
  await page.route(`**/companies/${companyId}`, (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/problem+json",
      body: JSON.stringify({ status: 403, code: "FORBIDDEN", title: "Forbidden" }),
    }),
  );
  await page.getByRole("link", { name: "Назад к бизнесу", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Рабочее пространство бизнеса", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Мой бизнес", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Выбранный счёт: Основной счёт" })).toHaveCount(0);
});

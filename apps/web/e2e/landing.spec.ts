import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [360, 768, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${width}px ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: "reduce" });

      test("landing example, navigation and accessibility work without an API", async ({
        page,
      }, testInfo) => {
        const apiRequests: string[] = [];
        page.on("request", (request) => {
          if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url());
        });
        await page.goto("/");
        const example = page.getByRole("region", { name: "Пример прогноза остатка" });
        await expect(example).toBeVisible();
        await expect(example.getByText("Смоделированный пример", { exact: true })).toBeVisible();
        await expect(example.locator("svg.recharts-surface")).toBeVisible();
        await expect(page.getByRole("heading", { name: "Частые вопросы" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Как это работает" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Прогноз на 30 дней" })).toBeVisible();
        await expect(example.getByText("Основной прогноз", { exact: true }).first()).toBeVisible();
        await expect(example.getByText("P50 — медиана сценариев", { exact: true }).first()).toBeVisible();
        await expect(page.getByText(/90 дней|XLSX|ClientBankExchange|Что если/)).toHaveCount(0);
        const dailyData = example.getByRole("button", { name: "Данные по дням", exact: true });
        await dailyData.focus();
        await page.keyboard.press("Enter");
        await expect(example.getByRole("button", { name: "Скрыть данные по дням" })).toHaveAttribute(
          "aria-expanded",
          "true",
        );
        await expect(example.getByRole("row")).toHaveCount(35);
        const expandedAudit = await new AxeBuilder({ page }).include("#forecast-example").analyze();
        expect(
          expandedAudit.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
        ).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
          true,
        );
        await example.getByRole("button", { name: "Скрыть данные по дням" }).click();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
          true,
        );
        const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
        const chart = await example.boundingBox();
        if (!heading || !chart) throw new Error("Hero content is missing");
        expect(
          width >= 1024 ? chart.x >= heading.x + heading.width : chart.y > heading.y + heading.height,
        ).toBe(true);
        const audit = await new AxeBuilder({ page }).analyze();
        expect(
          audit.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
        ).toEqual([]);
        await page.evaluate(() => window.scrollTo(0, 0));
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        await page.screenshot({ path: testInfo.outputPath("landing.png"), fullPage: true });
        if (width === 1440 && colorScheme === "dark") {
          await page.screenshot({ path: testInfo.outputPath("hero.png") });
        }
        const preview = page.getByRole("link", { name: "Посмотреть на примере" });
        await preview.focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/#forecast-example$/);
        await expect(example).toBeInViewport();
        expect(apiRequests).toEqual([]);
        await page.getByRole("link", { name: "Попробовать бесплатно", exact: true }).click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole("heading", { name: "Вход в Запас" })).toBeVisible();
      });
    });
  }
}

test("the animated example becomes visible with normal motion", async ({ page }) => {
  await page.goto("/");
  const example = page.getByRole("region", { name: "Пример прогноза остатка" });
  await expect(example.locator("svg.recharts-surface")).toBeVisible();
  await expect(page.getByRole("link", { name: "Попробовать бесплатно", exact: true })).toBeEnabled();
});

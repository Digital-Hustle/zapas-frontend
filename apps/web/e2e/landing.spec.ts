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
        await expect(page.getByRole("heading", { name: "Прогноз на 90 дней" })).toBeVisible();
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

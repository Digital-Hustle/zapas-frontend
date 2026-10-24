import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [360, 768, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`insights ${width}px ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: "reduce" });
      test("risk and quality preserve availability, units, keyboard and accessibility", async ({
        page,
      }, testInfo) => {
        const errors: string[] = [];
        const api: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("request", (r) => {
          if (new URL(r.url()).pathname.startsWith("/api/")) api.push(r.url());
        });
        await page.goto("/dev/forecast-insights");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Риск и качество — витрина v1");
        await expect(page.getByText("Смоделированный пример", { exact: true })).toBeVisible();
        await expect(page.getByRole("region", { name: "Кассовый разрыв" })).toBeVisible();
        await expect(page.getByText("Недостаточно истории для вероятности", { exact: true })).toBeVisible();
        await expect(page.getByText("Требует вашего согласования", { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: testInfo.outputPath(`risk-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        const riskAudit = await new AxeBuilder({ page }).analyze();
        expect(riskAudit.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual(
          [],
        );
        await page.getByRole("combobox", { name: "Доступность вероятности" }).click();
        await page.getByRole("option", { name: "Оценка доступна", exact: true }).click();
        await expect(page.getByText(/^30\s?%$/)).toBeVisible();
        const riskTab = page.getByRole("tab", { name: "Риск", exact: true });
        await riskTab.focus();
        await page.keyboard.press("ArrowRight");
        await expect(page.getByRole("tab", { name: "Качество", exact: true })).toBeFocused();
        await expect(page.getByRole("heading", { name: "Качество прогноза на истории" })).toBeVisible();
        await expect(page.getByText(/Результат устарел:/)).toBeVisible();
        await expect(page.getByText("Brier score", { exact: true })).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: testInfo.outputPath(`quality-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const qualityAudit = await new AxeBuilder({ page }).analyze();
        expect(
          qualityAudit.violations.filter((v) => v.impact === "serious" || v.impact === "critical"),
        ).toEqual([]);
        await page.getByRole("combobox", { name: "Состояние проверки" }).click();
        await page.getByRole("option", { name: "Проверки ещё нет", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Качество ещё не проверено" })).toBeVisible();
        await expect(page.getByText("MAE остатка", { exact: true })).toHaveCount(0);
        expect(api).toEqual([]);
        expect(errors).toEqual([]);
      });
    });
  }
}

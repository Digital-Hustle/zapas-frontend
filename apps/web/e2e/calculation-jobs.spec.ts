import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const width of [360, 768, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`calculation ${width}px ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: "reduce" });
      test("keeps saved results and guards offline, readonly and duplicate commands", async ({
        page,
      }, testInfo) => {
        const errors: string[] = [];
        const api: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("request", (r) => {
          if (new URL(r.url()).pathname.startsWith("/api/")) api.push(r.url());
        });
        await page.goto("/dev/calculation-jobs");
        const previous = page.getByRole("region", { name: "Сохранённый результат" });
        await expect(previous).toBeVisible();
        await expect(page.getByText("Расчёт завершился ошибкой", { exact: true })).toBeVisible();
        await expect(
          page.getByText("Недостаточно подтверждённой истории для расчёта", { exact: true }),
        ).toBeVisible();
        const audit = await new AxeBuilder({ page }).analyze();
        expect(audit.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
        await page.screenshot({
          path: testInfo.outputPath(`jobs-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await page.getByRole("combobox", { name: "Состояние задания" }).click();
        await page.getByRole("option", { name: "Выполняется", exact: true }).click();
        await expect(page.getByRole("button", { name: "Запустить новый расчёт", exact: true })).toHaveCount(
          0,
        );
        await page.getByRole("checkbox", { name: "Нет сети", exact: true }).click();
        await expect(page.getByRole("button", { name: "Обновить статус" })).toBeDisabled();
        await expect(previous).toBeVisible();
        await page.getByRole("checkbox", { name: "Нет сети", exact: true }).click();
        await page.getByRole("combobox", { name: "Состояние задания" }).click();
        await page.getByRole("option", { name: "Ошибка", exact: true }).click();
        await page.getByRole("checkbox", { name: "Только просмотр", exact: true }).click();
        await expect(page.getByRole("button", { name: "Запустить новый расчёт", exact: true })).toHaveCount(
          0,
        );
        await page.getByRole("checkbox", { name: "Только просмотр", exact: true }).click();
        await page
          .getByRole("button", { name: "Запустить новый расчёт", exact: true })
          .click({ clickCount: 2 });
        await expect(page.getByText("Заявок отправлено: 1", { exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Отменить задание", exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Отменить задание", exact: true }).click();
        await expect(page.getByText("Расчёт отменён", { exact: true })).toBeVisible();
        await page.getByRole("checkbox", { name: "Ошибка обновления", exact: true }).click();
        await expect(
          page.getByRole("button", { name: "Запустить новый расчёт", exact: true }),
        ).toBeDisabled();
        const refresh = page.getByRole("button", { name: "Обновить статус" });
        await refresh.focus();
        await page.keyboard.press("Enter");
        await expect(
          page.getByRole("checkbox", { name: "Ошибка обновления", exact: true }),
        ).not.toBeChecked();
        await expect(previous).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(errors).toEqual([]);
        expect(api).toEqual([]);
      });
    });
  }
}

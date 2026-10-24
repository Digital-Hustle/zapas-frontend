import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { service, url, sampleJob } from "./helpers/cashflow-service.ts";

test("calculation history has its own scoped empty page", async ({ page }) => {
  await service(page);
  await page.goto(url("jobs"));
  await expect(page.getByRole("heading", { name: "Расчёты", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Расчёты ещё не запускались", exact: true })).toBeVisible();
});

for (const type of ["FORECAST", "BACKTEST"] as const)
  test(`${type} opens a saved result in the correct account section`, async ({ page }) => {
    const state = await service(page);
    state.savedJobs.push(
      sampleJob({ type, resultId: type === "FORECAST" ? state.forecast.id : state.quality.id }),
    );
    await page.goto(url("jobs"));
    await page.getByRole("button", { name: "Открыть задание", exact: true }).click();
    await page.getByRole("link", { name: "Открыть результат", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${type === "FORECAST" ? "overview" : "quality"}\\?`));
    await expect(
      page.getByRole("heading", {
        name: type === "FORECAST" ? "Обзор и прогноз" : "Качество прогноза на истории",
        exact: true,
      }),
    ).toBeVisible();
  });

test("server history pagination replaces old cards", async ({ page }) => {
  const state = await service(page);
  state.jobsPaged = true;
  state.savedJobs.push(
    sampleJob(),
    sampleJob({ id: "00000000-0000-4000-8000-000000000011", type: "BACKTEST" }),
  );
  await page.goto(url("jobs"));
  await expect(page.getByText(/Прогноз · Завершён/)).toBeVisible();
  await page.getByRole("button", { name: "Следующая страница", exact: true }).click();
  await expect(page.getByText(/Проверка качества · Завершён/)).toBeVisible();
  await expect(page.getByText(/Прогноз · Завершён/)).toHaveCount(0);
});

test("an outage keeps saved job history and denial hides both list and selected job", async ({ page }) => {
  const state = await service(page);
  state.savedJobs.push(sampleJob());
  await page.goto(url("jobs"));
  await page.getByRole("button", { name: "Открыть задание", exact: true }).click();
  state.jobsStatus = 503;
  await page.getByRole("button", { name: "Обновить задания", exact: true }).click();
  await expect(page.getByRole("button", { name: "Открыть задание", exact: true })).toBeVisible();
  state.jobsStatus = 403;
  await page.getByRole("button", { name: "Обновить задания", exact: true }).click();
  await expect(page.getByRole("button", { name: "Открыть задание", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Состояние задания", exact: true })).toHaveCount(0);
});

test("an unknown job type or state does not offer a fabricated result route", async ({ page }) => {
  const state = await service(page);
  state.savedJobs.push(sampleJob({ type: "FUTURE", status: "FUTURE" }));
  await page.goto(url("jobs"));
  await expect(page.getByText(/Неизвестное задание/)).toBeVisible();
  await page.getByRole("button", { name: "Открыть задание", exact: true }).click();
  await expect(page.getByText("Неизвестное состояние", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Открыть результат", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Отменить задание", exact: true })).toHaveCount(0);
});

for (const width of [360, 768, 1440])
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`jobs ${width} ${colorScheme}`, () => {
      test.use({
        viewport: { width, height: 1000 },
        colorScheme,
        reducedMotion: width === 360 ? "reduce" : "no-preference",
      });
      test("history and selected job are accessible by keyboard", async ({ page }, info) => {
        const state = await service(page);
        state.savedJobs.push(sampleJob());
        await page.goto(url("jobs"));
        await page.getByRole("button", { name: "Открыть задание", exact: true }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("link", { name: "Открыть результат", exact: true })).toBeVisible();
        const axe = await new AxeBuilder({ page }).analyze();
        expect(axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual(
          [],
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath(`jobs-${width}-${colorScheme}.png`), fullPage: true });
      });
    });
  }

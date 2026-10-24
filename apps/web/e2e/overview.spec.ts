import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { service, url, time } from "./helpers/cashflow-service.ts";
test("overview displays the server forecast and unavailable probability separately", async ({ page }) => {
  await service(page);
  await page.goto(url("overview"));
  await expect(page.getByRole("heading", { name: "Обзор и прогноз", exact: true })).toBeVisible();
  await expect(page.getByText("Вероятность пока недоступна", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Данные по дням", exact: true }).click();
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("a new calculation preserves the saved forecast and reads its explicit result on success", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  await page.goto(url("overview"));
  await expect(page.getByRole("figure")).toHaveCount(1);
  await page.getByRole("button", { name: "Запустить прогноз", exact: true }).click();
  await expect(page.getByText("Выполняется", { exact: true })).toBeVisible();
  await expect(page.getByRole("figure")).toHaveCount(1);
  await expect(page).toHaveURL(/result=00000000-0000-4000-8000-000000000008/, { timeout: 15000 });
  await expect(
    page.getByText("Этот результат показан в текущем обзоре выше.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("figure")).toHaveCount(1);
  expect(
    state.requests.filter((row) => row.method === "POST" && row.path.endsWith("/forecast-jobs")),
  ).toHaveLength(1);
  expect(
    state.requests.some(
      (row) => row.method === "GET" && row.path.endsWith("/forecasts/00000000-0000-4000-8000-000000000008"),
    ),
  ).toBe(true);
});

test("a lost calculation command repeats the original key and dates", async ({ page }) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  state.forecastLost = true;
  await page.goto(url("overview"));
  await page.getByRole("button", { name: "Запустить прогноз", exact: true }).click();
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByText("Завершён", { exact: true })).toBeVisible({ timeout: 15000 });
  const calls = state.requests.filter((row) => row.path.endsWith("/forecast-jobs"));
  expect(calls).toHaveLength(2);
  expect(calls[0]?.body).toEqual(calls[1]?.body);
  expect(calls[0]?.headers["idempotency-key"]).toBe(calls[1]?.headers["idempotency-key"]);
});

test("a failed calculation retains the saved chart and its stale label", async ({ page }) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  state.failedJob = true;
  state.forecast.staleness = "STALE";
  await page.goto(url("overview"));
  await page.getByRole("button", { name: "Запустить прогноз", exact: true }).click();
  await expect(page.getByText("Ошибка расчёта", { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("figure")).toHaveCount(1);
  await expect(page.getByText(/Прогноз устарел/)).toBeVisible();
  await expect(page.getByText("private-financial-body", { exact: true })).toHaveCount(0);
});

test("only a queued calculation can be explicitly cancelled", async ({ page }) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  state.holdQueued = true;
  await page.goto(url("overview"));
  await page.getByRole("button", { name: "Запустить прогноз", exact: true }).click();
  await page.getByRole("button", { name: "Отменить задание", exact: true }).click();
  await expect(page.getByText("Отменён", { exact: true })).toBeVisible();
  expect(state.requests.find((row) => row.path.endsWith("/cancel"))?.headers["idempotency-key"]).toMatch(
    /^[0-9a-f-]{36}$/,
  );
  await expect(page.getByRole("figure")).toHaveCount(1);
});

test("no balance or forecast stays missing instead of being shown as zero", async ({ page }) => {
  const state = await service(page);
  state.emptyDashboard = true;
  await page.goto(url("overview"));
  await expect(page.getByRole("heading", { name: "Прогноз ещё не рассчитан", exact: true })).toBeVisible();
  await expect(page.getByText("Нет данных", { exact: true })).toBeVisible();
  await expect(page.getByText(/Отсутствующий остаток не считается нулём/)).toBeVisible();
  await expect(page.getByRole("figure")).toHaveCount(0);
});

test("an outage keeps the saved forecast read-only and a new denial hides it", async ({ page }) => {
  const state = await service(page);
  await page.goto(url("overview"));
  await expect(page.getByRole("figure")).toHaveCount(1);
  state.dashboardStatus = 503;
  await page.getByRole("button", { name: "Обновить обзор", exact: true }).click();
  await expect(page.getByRole("figure")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Запустить прогноз", exact: true })).toHaveCount(0);
  state.dashboardStatus = 403;
  await page.getByRole("button", { name: "Обновить обзор", exact: true }).click();
  await expect(page.getByRole("figure")).toHaveCount(0);
});

test("viewer can read a forecast but cannot start or cancel calculations", async ({ page }) => {
  await service(page, "VIEWER");
  await page.goto(url("overview"));
  await expect(page.getByRole("figure")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Запустить прогноз|Отменить задание/ })).toHaveCount(0);
});

test("an available zero probability is formatted as zero, separately from unavailable", async ({ page }) => {
  const state = await service(page);
  state.forecast.riskEstimate.availability = "AVAILABLE";
  state.forecast.riskEstimate.probability = 0;
  state.forecast.riskEstimate.scenarioCount = 2000;
  state.forecast.riskEstimate.calibrationOriginCount = 12;
  state.forecast.warnings = [];
  await page.goto(url("overview"));
  await expect(page.getByText(/Сценарная вероятность разрыва: 0\s*%/)).toBeVisible();
  await expect(page.getByText("Вероятность пока недоступна", { exact: true })).toHaveCount(0);
});

for (const width of [360, 768, 1440])
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`overview ${width} ${colorScheme}`, () => {
      test.use({
        viewport: { width, height: 1000 },
        colorScheme,
        reducedMotion: width === 360 ? "reduce" : "no-preference",
      });
      test("forecast and gap details support keyboard, both themes and a narrow viewport", async ({
        page,
      }, info) => {
        await service(page);
        await page.goto(url("overview"));
        await expect(page.getByRole("figure")).toHaveCount(1);
        await expect(page.getByText("Вероятность пока недоступна", { exact: true })).toBeVisible();
        let result = await new AxeBuilder({ page }).analyze();
        expect(
          result.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
        ).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: info.outputPath(`overview-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        const open = page.getByRole("button", { name: "Факторы и возможные действия", exact: true }).first();
        await open.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("heading", { name: "Кассовый разрыв", exact: true })).toBeVisible();
        result = await new AxeBuilder({ page }).analyze();
        expect(
          result.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
        ).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath(`risk-${width}-${colorScheme}.png`), fullPage: true });
      });
    });
  }

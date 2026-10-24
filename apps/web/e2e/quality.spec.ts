import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { service, url, time } from "./helpers/cashflow-service.ts";
test("quality loads a historical result and leaves missing metrics unavailable", async ({ page }) => {
  await service(page);
  await page.goto(url("quality"));
  await page.getByRole("button", { name: "Открыть проверку", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Качество прогноза на истории", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Недостаточно наблюдений").first()).toBeVisible();
});

test("a backtest job retains the previous result and opens the new result automatically", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  await page.goto(url("quality"));
  await page.getByRole("button", { name: "Открыть проверку", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Качество прогноза на истории", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Запустить проверку качества", exact: true }).click();
  await expect(page.getByText("Выполняется", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Качество прогноза на истории", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/result=00000000-0000-4000-8000-000000000009/, { timeout: 15000 });
  await expect(page.getByText("Завершён", { exact: true })).toBeVisible();
  expect(
    state.requests.some(
      (row) => row.method === "GET" && row.path.endsWith("/backtests/00000000-0000-4000-8000-000000000009"),
    ),
  ).toBe(true);
});

test("a lost backtest command preserves its key and historical cutoffs", async ({ page }) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  state.backtestLost = true;
  await page.goto(url("quality"));
  await page.getByRole("button", { name: "Запустить проверку качества", exact: true }).click();
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByText("Завершён", { exact: true })).toBeVisible({ timeout: 15000 });
  const calls = state.requests.filter((row) => row.path.endsWith("/backtest-jobs"));
  expect(calls).toHaveLength(2);
  expect(calls[0]?.body).toEqual(calls[1]?.body);
  expect(calls[0]?.headers["idempotency-key"]).toBe(calls[1]?.headers["idempotency-key"]);
});

test("an immature last historical cutoff is rejected before a command", async ({ page }) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  await page.goto(url("quality"));
  await page.getByLabel("Последний исторический срез", { exact: true }).click();
  await page.getByRole("button", { name: "Следующий месяц", exact: true }).click();
  await page
    .getByRole("button", { name: /сегодня/i })
    .first()
    .click();
  await page.getByRole("button", { name: "Запустить проверку качества", exact: true }).click();
  await expect(page.getByText("После последнего среза должно пройти 30 дней", { exact: true })).toBeVisible();
  expect(state.requests.filter((row) => row.path.endsWith("/backtest-jobs"))).toHaveLength(0);
});

test("historical origins use server pagination and preserve skipped reasons and nullable error", async ({
  page,
}) => {
  const state = await service(page);
  state.originsPaged = true;
  await page.goto(url("quality"));
  await page.getByRole("button", { name: "Открыть проверку", exact: true }).click();
  await expect(page.getByRole("heading", { name: /1 июня.*Проверен/ })).toBeVisible();
  await page.getByRole("button", { name: "Следующие срезы", exact: true }).click();
  await expect(page.getByText("Неполная история", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /1 июня.*Проверен/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /8 июня.*Пропущен/ })).toBeVisible();
});

test("stale partial quality stays readable on outage and disappears after a denied list", async ({
  page,
}) => {
  const state = await service(page);
  state.quality.status = "PARTIAL";
  state.quality.staleness = "STALE";
  await page.goto(url("quality"));
  await page.getByRole("button", { name: "Открыть проверку", exact: true }).click();
  await expect(page.getByText(/Результат устарел/)).toBeVisible();
  state.backtestsStatus = 503;
  await page.getByRole("button", { name: "Обновить проверки", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Качество прогноза на истории", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Запустить проверку качества", exact: true })).toHaveCount(0);
  state.backtestsStatus = 403;
  await page.getByRole("button", { name: "Обновить проверки", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Качество прогноза на истории", exact: true })).toHaveCount(
    0,
  );
});

test("viewer reads quality without running calculations", async ({ page }) => {
  await service(page, "VIEWER");
  await page.goto(url("quality"));
  await expect(page.getByRole("button", { name: "Открыть проверку", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Запустить проверку качества", exact: true })).toHaveCount(0);
});

test("no historical checks is an explicit empty state", async ({ page }) => {
  const state = await service(page);
  state.emptyBacktests = true;
  await page.goto(url("quality"));
  await expect(page.getByRole("heading", { name: "Качество ещё не проверено", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Открыть проверку", exact: true })).toHaveCount(0);
});

test("future status and scope are not labelled as a completed or partial historical mode", async ({
  page,
}) => {
  const state = await service(page);
  Object.assign(state.quality, { status: "FUTURE", scope: "FUTURE" });
  await page.goto(url("quality"));
  await page.getByRole("button", { name: "Открыть проверку", exact: true }).click();
  await expect(page.getByText("Неизвестное состояние проверки", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Режим этой проверки не распознан.", { exact: true })).toBeVisible();
});

for (const width of [360, 768, 1440])
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`quality ${width} ${colorScheme}`, () => {
      test.use({
        viewport: { width, height: 1000 },
        colorScheme,
        reducedMotion: width === 360 ? "reduce" : "no-preference",
      });
      test("historical quality and its form support keyboard and accessible layout", async ({
        page,
      }, info) => {
        const state = await service(page);
        state.originsPaged = true;
        state.quality.status = "PARTIAL";
        await page.goto(url("quality"));
        await page.getByRole("button", { name: "Открыть проверку", exact: true }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByText("Срезы не загружены.", { exact: true })).toHaveCount(0);
        await expect(page.getByText(/MAE:.*8/).first()).toBeVisible();
        const axe = await new AxeBuilder({ page }).analyze();
        expect(axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual(
          [],
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: info.outputPath(`quality-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await page.reload();
        await expect(
          page.getByRole("heading", { name: "Качество прогноза на истории", exact: true }),
        ).toBeVisible();
      });
    });
  }

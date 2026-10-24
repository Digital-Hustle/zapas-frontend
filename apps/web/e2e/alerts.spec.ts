import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { service, url, other } from "./helpers/cashflow-service.ts";

const acknowledge = "Отметить просмотренным";
test("viewing an alert leaves its active cause and links the scoped forecast gap", async ({ page }) => {
  const state = await service(page);
  await page.goto(url("alerts"));
  await expect(page.getByText("Вероятность риска: не предоставлена", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Открыть прогноз и факторы" })).toHaveAttribute(
    "href",
    `${url("overview")}&result=${state.forecast.id}&gap=${state.alert.gapId}`,
  );
  await page.getByRole("button", { name: acknowledge, exact: true }).click();
  await expect(page.getByText("Просмотрено", { exact: true })).toBeVisible();
  await expect(page.getByText("Активно", { exact: true })).toBeVisible();
  const call = state.requests.find((row) => row.path.endsWith("/acknowledge"));
  expect(call?.headers["if-match"]).toBe('"1"');
  expect(call?.headers["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
});
test("lost acknowledge repeats the original key and version without another action", async ({ page }) => {
  const state = await service(page);
  state.alertLost = true;
  await page.goto(url("alerts"));
  await page.getByRole("button", { name: acknowledge, exact: true }).click();
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByText("Просмотрено", { exact: true })).toBeVisible();
  const calls = state.requests.filter((row) => row.path.endsWith("/acknowledge"));
  expect(calls).toHaveLength(2);
  expect(calls[1]?.headers["idempotency-key"]).toBe(calls[0]?.headers["idempotency-key"]);
  expect(calls[1]?.headers["if-match"]).toBe('"1"');
  expect(state.alert.version).toBe(2);
});
test("version recovery reads later pages across active and historical alerts before explicit resubmission", async ({
  page,
}) => {
  const state = await service(page);
  state.alertsPaged = true;
  state.alerts.unshift({ ...state.alert, id: "00000000-0000-4000-8000-000000000011", active: false });
  state.alertConflict = true;
  await page.goto(url("alerts"));
  await page.getByRole("button", { name: acknowledge, exact: true }).click();
  await page.getByRole("button", { name: "Перечитать данные", exact: true }).click();
  await page.getByRole("button", { name: "Принять актуальную версию", exact: true }).click();
  expect(state.requests.filter((row) => row.path.endsWith("/acknowledge"))).toHaveLength(1);
  await page.getByRole("button", { name: acknowledge, exact: true }).click();
  await expect(page.getByText("Просмотрено", { exact: true })).toBeVisible();
  expect(state.requests.filter((row) => row.path.endsWith("/acknowledge")).at(-1)?.headers["if-match"]).toBe(
    '"2"',
  );
});
test("history filter, pages and zero probability reflect server values", async ({ page }) => {
  const state = await service(page);
  state.alert.probability = 0;
  state.alertsPaged = true;
  state.alerts.push({
    ...state.alert,
    id: "00000000-0000-4000-8000-000000000011",
    title: "Второе предупреждение",
  });
  await page.goto(url("alerts"));
  await expect(page.getByText("Вероятность риска: 0 %", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Следующая страница", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Второе предупреждение", exact: true })).toBeVisible();
  await page.getByLabel("Показать", { exact: true }).click();
  await page.getByRole("option", { name: "Исторические предупреждения", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Предупреждений нет", exact: true })).toBeVisible();
});
test("outage preserves read-only alerts and denial hides them", async ({ page }) => {
  const state = await service(page);
  await page.goto(url("alerts"));
  await expect(page.getByRole("button", { name: acknowledge, exact: true })).toBeVisible();
  state.alertsStatus = 503;
  await page.getByRole("button", { name: "Обновить предупреждения", exact: true }).click();
  await expect(page.getByRole("button", { name: acknowledge, exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: state.alert.title, exact: true })).toBeVisible();
  state.alertsStatus = 403;
  await page.getByRole("button", { name: "Обновить предупреждения", exact: true }).click();
  await expect(page.getByRole("heading", { name: state.alert.title, exact: true })).toHaveCount(0);
});
test("viewers can follow a payment cause without acknowledging", async ({ page }) => {
  const state = await service(page, "VIEWER");
  state.alert.expectedPaymentId = other;
  await page.goto(url("alerts"));
  await expect(page.getByRole("button", { name: acknowledge, exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Открыть будущий платёж", exact: true })).toHaveAttribute(
    "href",
    `${url("plans")}&plan=${other}`,
  );
});
for (const width of [360, 768, 1440])
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`alerts ${width} ${colorScheme}`, () => {
      test.use({
        viewport: { width, height: 1000 },
        colorScheme,
        reducedMotion: width === 360 ? "reduce" : "no-preference",
      });
      test("alert actions and filtering are keyboard accessible", async ({ page }, info) => {
        await service(page);
        await page.goto(url("alerts"));
        await page.getByRole("button", { name: acknowledge, exact: true }).focus();
        await expect(page.getByRole("button", { name: acknowledge, exact: true })).toBeFocused();
        const axe = await new AxeBuilder({ page }).analyze();
        expect(axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual(
          [],
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: info.outputPath(`alerts-${width}-${colorScheme}.png`),
          fullPage: true,
        });
      });
    });
  }

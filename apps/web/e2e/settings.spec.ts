import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { service, url, other } from "./helpers/cashflow-service.ts";
const save = "Сохранить настройки";
const buffer = "Минимальный запас денег";
const memberId = "00000000-0000-4000-8000-000000000012";

test("settings retain a draft on background refresh and advance If-Match after each save", async ({
  page,
}) => {
  const state = await service(page);
  await page.goto(url("settings"));
  await page.getByLabel(buffer, { exact: true }).fill("123,45");
  state.settings.version = 2;
  await page.getByRole("button", { name: "Обновить настройки", exact: true }).click();
  await expect(page.getByLabel(buffer, { exact: true })).toHaveValue("123,45");
  await page.getByRole("button", { name: save, exact: true }).click();
  await expect.poll(() => state.requests.filter((row) => row.method === "PUT").length).toBe(1);
  await expect(page.getByRole("button", { name: save, exact: true })).toBeEnabled();
  await page.getByLabel(buffer, { exact: true }).fill("0");
  await page.getByRole("button", { name: save, exact: true }).click();
  await expect.poll(() => state.requests.filter((row) => row.method === "PUT").length).toBe(2);
  const calls = state.requests.filter((row) => row.method === "PUT");
  expect(calls.map((row) => row.headers["if-match"])).toEqual(['"1"', '"3"']);
  expect(calls[1]?.body).toMatchObject({ forecast: { bufferAmount: "0.00", horizonDays: 30 } });
});
for (const failure of ["conflict", "lost"] as const)
  test(`${failure} settings keep the draft until reread, choice and separate save`, async ({ page }) => {
    const state = await service(page);
    await page.goto(url("settings"));
    await page.getByLabel(buffer, { exact: true }).fill("999,99");
    if (failure === "conflict") state.settingsConflict = true;
    else state.settingsLost = true;
    await page.getByRole("button", { name: save, exact: true }).click();
    await expect(page.getByText(/Черновик сохранён/)).toBeVisible();
    await expect(page.getByLabel(buffer, { exact: true })).toHaveValue("999,99");
    await page
      .getByRole("button", { name: "Оставить мой вариант с актуальной версией", exact: true })
      .click();
    expect(state.requests.filter((row) => row.method === "PUT")).toHaveLength(1);
    await page.getByRole("button", { name: save, exact: true }).click();
    await expect.poll(() => state.settings.version).toBe(3);
    expect(state.requests.filter((row) => row.method === "PUT").at(-1)?.headers["if-match"]).toBe('"2"');
  });
test("blank and out-of-range counts and negative buffer stay local validation errors", async ({ page }) => {
  const state = await service(page);
  await page.goto(url("settings"));
  const count = page.getByLabel("Количество исторических сценариев", { exact: true });
  await count.fill("");
  await page.getByRole("button", { name: save, exact: true }).click();
  await expect(count).toHaveValue("");
  await expect(page.getByText("Введите число от 100 до 5000", { exact: true })).toBeVisible();
  await count.fill("5001");
  await page.getByLabel(buffer, { exact: true }).fill("-1");
  await page.getByRole("button", { name: save, exact: true }).click();
  await expect(page.getByText("Максимум 5000 сценариев", { exact: true })).toBeVisible();
  expect(state.requests.filter((row) => row.method === "PUT")).toHaveLength(0);
});
test("settings outage preserves a disabled draft and denial hides it", async ({ page }) => {
  const state = await service(page);
  await page.goto(url("settings"));
  await page.getByLabel(buffer, { exact: true }).fill("321,00");
  state.settingsStatus = 503;
  await page.getByRole("button", { name: "Обновить настройки", exact: true }).click();
  await expect(page.getByLabel(buffer, { exact: true })).toBeDisabled();
  await expect(page.getByLabel(buffer, { exact: true })).toHaveValue(/321/);
  state.settingsStatus = 403;
  await page.getByRole("button", { name: "Обновить настройки", exact: true }).click();
  await expect(page.getByLabel(buffer, { exact: true })).toHaveCount(0);
});
for (const role of ["VIEWER", "ACCOUNTANT"] as const)
  test(`${role} has the intended settings and member permissions`, async ({ page }) => {
    await service(page, role);
    await page.goto(url("settings"));
    await expect(page.getByRole("heading", { name: "Параметры прогноза", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить участника", exact: true })).toHaveCount(0);
    if (role === "VIEWER") await expect(page.getByRole("button", { name: save, exact: true })).toHaveCount(0);
    else {
      await expect(page.getByRole("button", { name: save, exact: true })).toBeVisible();
      await expect(page.getByText(other, { exact: true })).toBeVisible();
    }
  });
test("only an existing user ID can be added and lost responses retain the key; owner is protected", async ({
  page,
}) => {
  const state = await service(page);
  state.memberLost = true;
  await page.goto(url("settings"));
  await expect(page.getByLabel("Новая роль", { exact: true })).toHaveCount(0);
  await page.getByLabel("ID пользователя", { exact: true }).fill("new@example.test");
  await page.getByRole("button", { name: "Добавить участника", exact: true }).click();
  await expect(page.getByText("Введите ID зарегистрированного пользователя", { exact: true })).toBeVisible();
  await page.getByLabel("ID пользователя", { exact: true }).fill(memberId);
  await page.getByRole("button", { name: "Добавить участника", exact: true }).click();
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByText(memberId, { exact: true })).toBeVisible();
  const calls = state.requests.filter((row) => row.path.endsWith("/members") && row.method === "POST");
  expect(calls).toHaveLength(2);
  expect(calls[0]?.headers["idempotency-key"]).toBe(calls[1]?.headers["idempotency-key"]);
  expect(state.members).toHaveLength(2);
});
test("member role conflicts require an explicit version choice and removal is separate", async ({ page }) => {
  const state = await service(page);
  state.members.push({ userId: memberId, role: "VIEWER", version: 1, joinedAt: "2026-10-24T09:00:00Z" });
  await page.goto(url("settings"));
  await page.getByLabel("Новая роль", { exact: true }).click();
  await page.getByRole("option", { name: "Бухгалтер", exact: true }).click();
  state.memberConflict = true;
  await page.getByRole("button", { name: "Сохранить роль", exact: true }).click();
  await page.getByRole("button", { name: "Оставить мой вариант с актуальной версией", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить роль", exact: true }).click();
  await expect(page.locator("p").filter({ hasText: /^Бухгалтер$/ })).toBeVisible();
  expect(
    state.requests.filter((row) => row.path.endsWith(`/members/${memberId}`)).at(-1)?.headers["if-match"],
  ).toBe('"2"');
  await page.getByText("Удалить доступ участника", { exact: true }).click();
  await page.getByRole("button", { name: "Подтвердить удаление участника", exact: true }).click();
  await expect(page.getByText(memberId, { exact: true })).toHaveCount(0);
  expect(state.members[0]?.role).toBe("OWNER");
});
test("completeness starts unknown, requires a reason and repeats one explicit confirmation", async ({
  page,
}) => {
  const state = await service(page);
  state.completenessLost = true;
  await page.goto(url("settings"));
  await page.getByText("Уточнить полноту периода", { exact: true }).click();
  await page.getByRole("button", { name: "Сохранить полноту периода", exact: true }).click();
  expect(state.completeness).toHaveLength(0);
  await page.getByLabel("Полнота", { exact: true }).click();
  await page.getByRole("option", { name: "Все операции за период загружены", exact: true }).click();
  await page.getByLabel("Основание подтверждения", { exact: true }).fill("Тестовый период проверен");
  await page.getByRole("button", { name: "Сохранить полноту периода", exact: true }).click();
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByText(/Полнота подтверждена · Тестовый период/)).toBeVisible();
  const calls = state.requests.filter(
    (row) => row.path.endsWith("/completeness-ranges") && row.method === "POST",
  );
  expect(calls).toHaveLength(2);
  expect(calls[0]?.headers["idempotency-key"]).toBe(calls[1]?.headers["idempotency-key"]);
  expect(state.completeness).toHaveLength(1);
});
for (const width of [360, 768, 1440])
  for (const colorScheme of ["light", "dark"] as const)
    test.describe(`settings ${width} ${colorScheme}`, () => {
      test.use({
        viewport: { width, height: 1000 },
        colorScheme,
        reducedMotion: width === 360 ? "reduce" : "no-preference",
      });
      test("settings, members and completeness support keyboard and accessible layout", async ({
        page,
      }, info) => {
        const state = await service(page);
        state.members.push({
          userId: memberId,
          role: "VIEWER",
          version: 1,
          joinedAt: "2026-10-24T09:00:00Z",
        });
        await page.goto(url("settings"));
        await page.getByText("Уточнить полноту периода", { exact: true }).click();
        await page.getByLabel(buffer, { exact: true }).focus();
        await expect(page.getByLabel(buffer, { exact: true })).toBeFocused();
        const axe = await new AxeBuilder({ page }).analyze();
        expect(axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual(
          [],
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: info.outputPath(`settings-${width}-${colorScheme}.png`),
          fullPage: true,
        });
      });
    });

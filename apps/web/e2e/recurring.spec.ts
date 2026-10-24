import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { service, url, time } from "./helpers/cashflow-service.ts";

test("confirmation keeps exact money and excludes candidates only by an explicit versioned save", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  await page.goto(url("recurring"));
  await expect(page.getByText("Кандидат", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Подтвердить или уточнить", exact: true }).click();
  await page.getByLabel("Использование в прогнозе", { exact: true }).click();
  await page.getByRole("option", { name: "Подтвердить — учитывать", exact: true }).click();
  await page.getByLabel("Сумма регулярного платежа", { exact: true }).fill("99999999999999999,99");
  await page.getByRole("button", { name: "Сохранить регулярность", exact: true }).click();
  await expect(page.getByText("Подтверждено", { exact: true })).toBeVisible();
  expect(state.requests.find((row) => row.method === "PUT")?.body).toMatchObject({
    status: "CONFIRMED",
    amount: "99999999999999999.99",
    schedule: { frequency: "MONTHLY", dayOfMonth: 1, weekday: null, businessDayRule: "FOLLOWING" },
  });
  expect(state.requests.find((row) => row.method === "PUT")?.headers["if-match"]).toBe('"1"');
});

for (const failure of ["conflict", "lost"] as const) {
  test(`${failure} response keeps the recurring draft until a read, explicit choice and separate save`, async ({
    page,
  }) => {
    const state = await service(page);
    await page.goto(url("recurring"));
    await page.getByRole("button", { name: "Подтвердить или уточнить", exact: true }).click();
    await page.getByLabel("Сумма регулярного платежа", { exact: true }).fill("1500,25");
    if (failure === "conflict") state.recurringConflict = true;
    else state.recurringLost = true;
    await page.getByRole("button", { name: "Сохранить регулярность", exact: true }).click();
    await expect(page.getByText(/Черновик сохранён/)).toBeVisible();
    await expect(page.getByLabel("Сумма регулярного платежа", { exact: true })).toHaveValue(/1\s500,25/);
    await page
      .getByRole("button", { name: "Оставить мой вариант с актуальной версией", exact: true })
      .click();
    expect(state.requests.filter((row) => row.method === "PUT")).toHaveLength(1);
    await page.getByRole("button", { name: "Сохранить регулярность", exact: true }).click();
    await expect(page.getByRole("button", { name: "Сохранить регулярность", exact: true })).toHaveCount(0);
    expect(state.requests.filter((row) => row.method === "PUT").at(-1)?.headers["if-match"]).toBe('"2"');
  });
}

test("a lost detection command retains its payload and key, guards navigation and polls until terminal", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  state.detectLost = true;
  await page.goto(url("recurring"));
  await page.getByRole("button", { name: "Найти регулярности", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить ту же команду", exact: true })).toBeVisible();
  expect(state.detectCalls).toBe(1);
  await page.getByRole("link", { name: "Назад к бизнесу", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Проверить результат перед переходом?", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Остаться", exact: true }).click();
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByText("Завершён", { exact: true })).toBeVisible({ timeout: 15000 });
  const calls = state.requests.filter((row) => row.path.endsWith("/recurring-detection-jobs"));
  expect(calls).toHaveLength(2);
  expect(calls[0]?.body).toEqual(calls[1]?.body);
  expect(calls[0]?.headers["idempotency-key"]).toBe(calls[1]?.headers["idempotency-key"]);
  expect(state.jobReads).toBe(3);
  await expect(page.getByText(/Ссылка на результат отсутствует/)).toHaveCount(0);
});

test("an outage keeps candidates read-only and a later denial hides them", async ({ page }) => {
  const state = await service(page);
  await page.goto(url("recurring"));
  await expect(page.getByText("Кандидат", { exact: true })).toBeVisible();
  state.recurringStatus = 503;
  await page.getByRole("button", { name: "Обновить регулярности", exact: true }).click();
  await expect(page.getByText("Кандидат", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Подтвердить или уточнить", exact: true })).toHaveCount(0);
  state.recurringStatus = 403;
  await page.getByRole("button", { name: "Обновить регулярности", exact: true }).click();
  await expect(page.getByText("Кандидат", { exact: true })).toHaveCount(0);
});

test("a viewer reads candidates without commands; an unknown direction stays unknown", async ({ page }) => {
  const state = await service(page, "VIEWER");
  state.recurring.direction = "FUTURE";
  await page.goto(url("recurring"));
  await expect(page.getByText(/Неизвестное направление/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Найти регулярности|Подтвердить или уточнить/ })).toHaveCount(
    0,
  );
});

for (const width of [360, 768, 1440])
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`recurring ${width} ${colorScheme}`, () => {
      test.use({
        viewport: { width, height: 1000 },
        colorScheme,
        reducedMotion: width === 360 ? "reduce" : "no-preference",
      });
      test("candidate and schedule form support keyboard and accessible layout", async ({ page }, info) => {
        await service(page);
        await page.goto(url("recurring"));
        await expect(page.getByText("Кандидат", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Подтвердить или уточнить", exact: true }).focus();
        await page.keyboard.press("Enter");
        await expect(page.getByLabel("Сумма регулярного платежа", { exact: true })).toBeVisible();
        await page.getByLabel("Сумма регулярного платежа", { exact: true }).focus();
        await expect(page.getByLabel("Сумма регулярного платежа", { exact: true })).toBeFocused();
        const result = await new AxeBuilder({ page }).analyze();
        expect(
          result.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
        ).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: info.outputPath(`recurring-${width}-${colorScheme}.png`),
          fullPage: true,
        });
      });
    });
  }

test("weekly and monthly edits clear the other day and exclusion is explicit", async ({ page }) => {
  const state = await service(page);
  await page.goto(url("recurring"));
  const edit = () => page.getByRole("button", { name: "Подтвердить или уточнить", exact: true }).click();
  await edit();
  await page.getByLabel("Периодичность", { exact: true }).click();
  await page.getByRole("option", { name: "Каждую неделю", exact: true }).click();
  await page.getByLabel("День недели", { exact: true }).click();
  await page.getByRole("option", { name: "Воскресенье", exact: true }).click();
  await page.getByLabel("Использование в прогнозе", { exact: true }).click();
  await page.getByRole("option", { name: "Исключить", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить регулярность", exact: true }).click();
  await expect(page.getByText("Исключено", { exact: true })).toBeVisible();
  expect(state.requests.filter((row) => row.method === "PUT").at(-1)?.body).toMatchObject({
    status: "EXCLUDED",
    schedule: { frequency: "WEEKLY", weekday: 7, dayOfMonth: null },
  });
  await edit();
  await page.getByLabel("Периодичность", { exact: true }).click();
  await page.getByRole("option", { name: "Каждый месяц", exact: true }).click();
  await page.getByLabel("Число месяца", { exact: true }).click();
  await page.getByRole("option", { name: "31", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить регулярность", exact: true }).click();
  await expect(page.getByRole("button", { name: "Сохранить регулярность", exact: true })).toHaveCount(0);
  expect(state.requests.filter((row) => row.method === "PUT").at(-1)?.body).toMatchObject({
    schedule: { frequency: "MONTHLY", weekday: null, dayOfMonth: 31 },
  });
});

test("insufficient history ends detection polling and keeps the previous candidates", async ({ page }) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  state.failedJob = true;
  await page.goto(url("recurring"));
  await page.getByRole("button", { name: "Найти регулярности", exact: true }).click();
  await expect(page.getByText("Ошибка расчёта", { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText("Недостаточно полных дней истории для расчёта.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Кандидат", { exact: true })).toBeVisible();
  await expect(page.getByText("private-financial-body", { exact: true })).toHaveCount(0);
  expect(state.jobReads).toBe(3);
});

test("a rate limit after a lost detection response keeps the first key and payload", async ({ page }) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  state.detectLost = true;
  state.detectRetry = true;
  await page.goto(url("recurring"));
  await page.getByRole("button", { name: "Найти регулярности", exact: true }).click();
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByRole("button", { name: /Повторить через/ })).toBeDisabled();
  await page.clock.setFixedTime(new Date(Date.parse(time) + 2000));
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByText("Завершён", { exact: true })).toBeVisible({ timeout: 15000 });
  const calls = state.requests.filter((row) => row.path.endsWith("/recurring-detection-jobs"));
  expect(calls).toHaveLength(3);
  expect(new Set(calls.map((row) => row.headers["idempotency-key"])).size).toBe(1);
  expect(calls[0]?.body).toEqual(calls[2]?.body);
});

test("a server validation error stays under the amount without exposing the response body", async ({
  page,
}) => {
  const state = await service(page);
  state.recurringValidation = true;
  await page.goto(url("recurring"));
  await page.getByRole("button", { name: "Подтвердить или уточнить", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить регулярность", exact: true }).click();
  await expect(
    page.getByText("Введите сумму больше нуля, до 17 цифр и два знака после запятой", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("private-financial-body", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Сохранить регулярность", exact: true })).toBeVisible();
});

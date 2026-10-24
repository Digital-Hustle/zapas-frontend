import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { service, url, accountId, other, samplePlan, samplePayment } from "./helpers/cashflow-service.ts";
test("a plan is created with exact money and a version conflict requires an explicit separate save", async ({
  page,
}) => {
  const state = await service(page);
  await page.goto(url("plans"));
  await page.getByRole("button", { name: "Добавить будущий платёж", exact: true }).click();
  await page.getByLabel("Название платежа", { exact: true }).fill("Аренда офиса");
  await page.getByLabel("Сумма", { exact: true }).fill("125000,50");
  await page.getByLabel("Дата платежа", { exact: true }).click();
  await page
    .getByRole("button", { name: /сегодня/i })
    .first()
    .click();
  await page.getByLabel("Категория", { exact: true }).click();
  await page.getByRole("option", { name: "Аренда", exact: true }).click();
  await page.getByLabel("Подтверждаю, что этот платёж не дублирует ожидаемый поток").check();
  await page.getByRole("button", { name: "Создать платёж", exact: true }).click();
  await expect(page.getByText("Аренда офиса", { exact: true })).toBeVisible();
  expect(
    state.requests.find((row) => row.path.endsWith("/expected-payments") && row.method === "POST")?.body,
  ).toMatchObject({
    amount: "125000.50",
    accountId,
    recurringPatternId: null,
    baselineCounterpartyKey: null,
  });
  const key = state.requests.find((row) => row.path.endsWith("/expected-payments") && row.method === "POST")
    ?.headers["idempotency-key"];
  expect(key).toMatch(/^[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Подробнее", exact: true }).click();
  await page.getByRole("button", { name: "Редактировать платёж", exact: true }).click();
  await page.getByLabel("Название платежа", { exact: true }).fill("Мой черновик");
  state.conflict = true;
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  await expect(page.getByText(/Черновик сохранён/)).toBeVisible();
  await expect(page.getByLabel("Название платежа", { exact: true })).toHaveValue("Мой черновик");
  await page.getByRole("button", { name: "Оставить мой вариант с актуальной версией" }).click();
  expect(state.requests.filter((row) => row.method === "PUT").length).toBe(1);
  await page.getByRole("button", { name: "Сохранить изменения", exact: true }).click();
  expect(state.requests.filter((row) => row.method === "PUT").at(-1)?.headers["if-match"]).toBe('"2"');
});

async function fillPlan(page: Page) {
  await page.getByRole("button", { name: "Добавить будущий платёж", exact: true }).click();
  await page.getByLabel("Название платежа", { exact: true }).fill("Аренда офиса");
  await page.getByLabel("Сумма", { exact: true }).fill("125000,50");
  await page.getByLabel("Дата платежа", { exact: true }).click();
  await page
    .getByRole("button", { name: /сегодня/i })
    .first()
    .click();
  await page.getByLabel("Категория", { exact: true }).click();
  await page.getByRole("option", { name: "Аренда", exact: true }).click();
}

test("an additional plan requires explicit confirmation of no double counting", async ({ page }) => {
  const state = await service(page);
  await page.goto(url("plans"));
  await fillPlan(page);
  await page.getByRole("button", { name: "Создать платёж", exact: true }).click();
  await expect(page.getByText("Подтвердите отсутствие двойного учёта", { exact: true })).toBeVisible();
  expect(
    state.requests.filter((row) => row.method === "POST" && row.path.endsWith("/expected-payments")),
  ).toHaveLength(0);
});

for (const relation of ["REPLACES_RECURRING", "REPLACES_BASELINE"] as const) {
  test(`${relation} sends the selected replacement and clears the unused relation target`, async ({
    page,
  }) => {
    const state = await service(page);
    state.recurring.status = "CONFIRMED";
    await page.goto(url("plans"));
    await fillPlan(page);
    await page.getByLabel("Как учитывать в прогнозе", { exact: true }).click();
    await page
      .getByRole("option", {
        name:
          relation === "REPLACES_RECURRING"
            ? "Вместо регулярного платежа"
            : "Вместо базового потока контрагента",
        exact: true,
      })
      .click();
    await page
      .getByLabel(relation === "REPLACES_RECURRING" ? "Заменяемая регулярность" : "Заменяемый контрагент", {
        exact: true,
      })
      .click();
    await page
      .getByRole("option", { name: relation === "REPLACES_RECURRING" ? /RENT/ : "Арендодатель" })
      .click();
    if (relation === "REPLACES_BASELINE")
      await expect(page.getByText(/Все базовые потоки выбранного контрагента/)).toBeVisible();
    await page.getByRole("button", { name: "Создать платёж", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Аренда офиса", exact: true })).toBeVisible();
    expect(
      state.requests.find((row) => row.method === "POST" && row.path.endsWith("/expected-payments"))?.body,
    ).toMatchObject({
      relation,
      recurringPatternId: relation === "REPLACES_RECURRING" ? other : null,
      baselineCounterpartyKey: relation === "REPLACES_BASELINE" ? "inn:123" : null,
    });
  });
}

test("a lost create replays its exact original payload and key without adding a second plan", async ({
  page,
}) => {
  const state = await service(page);
  state.planLost = true;
  await page.goto(url("plans"));
  await fillPlan(page);
  await page.getByLabel("Подтверждаю, что этот платёж не дублирует ожидаемый поток").check();
  await page.getByRole("button", { name: "Создать платёж", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить ту же команду", exact: true })).toBeVisible();
  await expect(page.getByLabel("Название платежа", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Повторить ту же команду", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Аренда офиса", exact: true })).toBeVisible();
  const calls = state.requests.filter(
    (row) => row.method === "POST" && row.path.endsWith("/expected-payments"),
  );
  expect(calls).toHaveLength(2);
  expect(calls[0]?.body).toEqual(calls[1]?.body);
  expect(calls[0]?.headers["idempotency-key"]).toBe(calls[1]?.headers["idempotency-key"]);
  expect(state.plans).toHaveLength(1);
});

test("partial allocations display server totals and reversal never creates or edits a bank fact", async ({
  page,
}) => {
  const state = await service(page);
  state.plans.push(samplePlan());
  state.payments.push(samplePayment());
  await page.goto(url("plans"));
  await page.getByRole("button", { name: "Подробнее", exact: true }).click();
  const detail = page
    .getByRole("heading", { name: "Подробности будущего платежа", exact: true })
    .locator("..");
  await expect(detail.getByText(/Платёж просрочен/)).toBeVisible();
  await page.getByLabel("Операция из выписки", { exact: true }).click();
  await page.getByRole("option", { name: /Арендодатель/ }).click();
  await page.getByLabel("Сумма сопоставления", { exact: true }).fill("50,00");
  await page.getByRole("button", { name: "Сопоставить оплату", exact: true }).click();
  await expect(detail.getByText(/^75,00\s*₽$/)).toBeVisible();
  const allocation = state.requests.find((row) => row.method === "POST" && row.path.endsWith("/allocations"));
  expect(allocation?.headers["if-match"]).toBe('"1"');
  expect(allocation?.body).toEqual({ paymentId: other, amount: "50.00" });
  await page.getByRole("button", { name: "Снять сопоставление", exact: true }).click();
  await expect(page.getByRole("button", { name: "Снять сопоставление", exact: true })).toHaveCount(0);
  expect(state.requests.find((row) => row.method === "DELETE")?.headers["if-match"]).toBe('"2"');
  expect(state.requests.filter((row) => row.path.endsWith("/payments") && row.method !== "GET")).toHaveLength(
    0,
  );
  expect(state.payments[0]?.amount).toBe("1000.00");
});

test("cancelling the unpaid part sends the explicit reason, version and key", async ({ page }) => {
  const state = await service(page);
  state.plans.push(
    samplePlan({ status: "PARTIALLY_SETTLED", settledAmount: "50.00", remainingAmount: "100.00" }),
  );
  await page.goto(url("plans"));
  await page.getByRole("button", { name: "Подробнее", exact: true }).click();
  await page.getByRole("button", { name: "Отменить неоплаченную часть", exact: true }).click();
  await page.getByLabel("Причина отмены", { exact: true }).fill("Согласовано с контрагентом");
  await page.getByRole("button", { name: "Подтвердить отмену", exact: true }).click();
  await expect(page.getByText(/CANCELLED/)).toBeVisible();
  const call = state.requests.find((row) => row.path.endsWith("/cancel"));
  expect(call?.body).toEqual({ reason: "Согласовано с контрагентом" });
  expect(call?.headers["if-match"]).toBe('"1"');
  expect(call?.headers["idempotency-key"]).toMatch(/^[0-9a-f-]{36}$/);
  expect(state.plans[0]?.settledAmount).toBe("50.00");
});

test("a viewer can inspect partial and overdue plans without write controls", async ({ page }) => {
  const state = await service(page, "VIEWER");
  state.plans.push(
    samplePlan({ status: "PARTIALLY_SETTLED", settledAmount: "50.00", remainingAmount: "75.00" }),
  );
  await page.goto(url("plans"));
  await page.getByRole("button", { name: "Подробнее", exact: true }).click();
  await expect(page.getByText(/Платёж просрочен/)).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: /Редактировать платёж|Создать платёж|Сопоставить оплату|Добавить будущий|Подтвердить отмену/,
    }),
  ).toHaveCount(0);
});

for (const width of [360, 768, 1440])
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`plans ${width} ${colorScheme}`, () => {
      test.use({
        viewport: { width, height: 1000 },
        colorScheme,
        reducedMotion: width === 360 ? "reduce" : "no-preference",
      });
      test("plan form is usable with keyboard and fits the viewport", async ({ page }, info) => {
        const state = await service(page);
        await page.goto(url("plans"));
        await page.getByRole("button", { name: "Добавить будущий платёж", exact: true }).focus();
        await page.keyboard.press("Enter");
        await page.getByLabel("Название платежа", { exact: true }).focus();
        await expect(page.getByLabel("Название платежа", { exact: true })).toBeFocused();
        const axe = await new AxeBuilder({ page }).analyze();
        expect(axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual(
          [],
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath(`plans-${width}-${colorScheme}.png`), fullPage: true });
        await page.getByRole("button", { name: "Отмена", exact: true }).click();
        state.plans.push(
          samplePlan({ status: "PARTIALLY_SETTLED", settledAmount: "50.00", remainingAmount: "75.00" }),
        );
        await page.getByRole("button", { name: "Обновить платежи", exact: true }).click();
        await page.getByRole("button", { name: "Подробнее", exact: true }).click();
        await expect(page.getByText(/Платёж просрочен/)).toBeVisible();
        const detail = await new AxeBuilder({ page }).analyze();
        expect(
          detail.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
        ).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({
          path: info.outputPath(`plan-detail-${width}-${colorScheme}.png`),
          fullPage: true,
        });
      });
    });
  }

test("an external register validates scope and relations before importing a prepared document", async ({
  page,
}) => {
  const state = await service(page);
  await page.goto(url("plans"));
  await page.getByText("Импорт внешнего реестра счетов и налогов", { exact: true }).click();
  const item = {
    accountId,
    title: "Налог по реестру",
    direction: "OUT",
    amount: "125.00",
    dueDate: "2026-11-01",
    categoryCode: "RENT",
    counterpartyKey: null,
    note: null,
    relation: "ADDITIONAL",
    recurringPatternId: null,
    baselineCounterpartyKey: null,
    source: "TAX",
    sourceDocument: { externalSystem: "ERP", externalId: "tax-1", documentNumber: null, issuedDate: null },
    expectedVersion: null,
  };
  const register = (row: typeof item) => JSON.stringify({ externalSource: "TAX_REGISTER", items: [row] });
  await page.getByLabel("JSON реестра", { exact: true }).fill(register({ ...item, accountId: other }));
  await page.getByRole("button", { name: "Импортировать реестр", exact: true }).click();
  await expect(page.getByText("Проверьте JSON реестра и ID выбранного счёта", { exact: true })).toBeVisible();
  expect(state.requests.filter((row) => row.path.endsWith("/expected-payment-imports"))).toHaveLength(0);
  await page
    .getByLabel("JSON реестра", { exact: true })
    .fill(register({ ...item, relation: "REPLACES_RECURRING" }));
  await page.getByRole("button", { name: "Импортировать реестр", exact: true }).click();
  expect(state.requests.filter((row) => row.path.endsWith("/expected-payment-imports"))).toHaveLength(0);
  await expect(page.getByLabel("JSON реестра", { exact: true })).toBeEnabled();
  await page.getByLabel("JSON реестра", { exact: true }).fill(register(item));
  await page.getByRole("button", { name: "Импортировать реестр", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Налог по реестру", exact: true })).toBeVisible();
  expect(state.requests.find((row) => row.path.endsWith("/expected-payment-imports"))?.body).toMatchObject({
    externalSource: "TAX_REGISTER",
    items: [{ accountId, amount: "125.00", source: "TAX" }],
  });
});

test("allocation conflict reads and accepts the new plan version before a separate command", async ({
  page,
}) => {
  const state = await service(page);
  state.plans.push(samplePlan());
  state.payments.push(samplePayment());
  state.allocationConflict = true;
  await page.goto(url("plans"));
  await page.getByRole("button", { name: "Подробнее", exact: true }).click();
  await page.getByLabel("Операция из выписки", { exact: true }).click();
  await page.getByRole("option", { name: /Арендодатель/ }).click();
  await page.getByLabel("Сумма сопоставления", { exact: true }).fill("50,00");
  await page.getByRole("button", { name: "Сопоставить оплату", exact: true }).click();
  await page.getByRole("button", { name: "Перечитать данные", exact: true }).click();
  await page.getByRole("button", { name: "Принять актуальную версию", exact: true }).click();
  expect(
    state.requests.filter((row) => row.method === "POST" && row.path.endsWith("/allocations")),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "Сопоставить оплату", exact: true }).click();
  await expect(page.getByRole("button", { name: "Снять сопоставление", exact: true })).toBeVisible();
  const calls = state.requests.filter((row) => row.method === "POST" && row.path.endsWith("/allocations"));
  expect(calls.at(-1)?.headers["if-match"]).toBe('"2"');
  expect(calls[0]?.headers["idempotency-key"]).not.toBe(calls[1]?.headers["idempotency-key"]);
});

test("status filtering uses the server and shows a filtered empty state", async ({ page }) => {
  const state = await service(page);
  state.plans.push(samplePlan());
  await page.goto(url("plans"));
  await expect(page.getByRole("heading", { name: "Аренда", exact: true })).toBeVisible();
  await page.getByLabel("Состояние", { exact: true }).click();
  await page.getByRole("option", { name: "Исполненные", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Будущих платежей пока нет", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Аренда", exact: true })).toHaveCount(0);
});

test("a denied list hides cached titles and an unknown direction cannot be edited", async ({ page }) => {
  const state = await service(page);
  state.plans.push(samplePlan({ direction: "FUTURE" }));
  await page.goto(url("plans"));
  await expect(page.getByText(/Неизвестное направление/)).toBeVisible();
  await page.getByRole("button", { name: "Подробнее", exact: true }).click();
  await expect(page.getByRole("button", { name: "Редактировать платёж", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Закрыть подробности", exact: true }).click();
  state.plansStatus = 503;
  await page.getByRole("button", { name: "Обновить платежи", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Аренда", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Добавить будущий платёж", exact: true })).toHaveCount(0);
  state.plansStatus = 403;
  await page.getByRole("button", { name: "Обновить платежи", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Аренда", exact: true })).toHaveCount(0);
});

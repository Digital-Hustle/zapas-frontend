import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function chooseMode(page: Page, name: string) {
  await page.getByRole("combobox", { name: "Ответ сервиса", exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}
async function requestCode(page: Page) {
  await page.getByLabel("Рабочая почта", { exact: true }).fill("owner@example.test");
  await page.getByRole("button", { name: "Получить код", exact: true }).click({ clickCount: 2 });
  const otp = page.getByRole("textbox", { name: "Код из письма, шесть цифр", exact: true });
  await expect(otp).toHaveValue("");
  await expect(page.getByText("Введите шесть цифр из письма", { exact: true })).toHaveCount(0);
  return otp;
}
async function signIn(page: Page) {
  await page.goto("/dev/auth-profile/login");
  const otp = await requestCode(page);
  await otp.fill("000123");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/dev\/auth-profile\/profile$/);
}
async function audit(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
}

test("unconfigured login does not use legacy endpoints or expose a code", async ({ page }) => {
  const api: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    api.push(new URL(route.request().url()).pathname);
    await route.abort();
  });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Вход в Запас" })).toBeVisible();
  await expect(page.getByText("Сервис входа пока недоступен.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Получить код", exact: true })).toHaveCount(0);
  expect(api).toEqual([]);
});

for (const width of [360, 768, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`auth ${width}px ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: "reduce" });
      test("login, nullable name, session confirmation and logout work with keyboard and axe", async ({
        page,
      }, testInfo) => {
        const api: string[] = [];
        const errors: string[] = [];
        page.on("request", (r) => {
          if (new URL(r.url()).pathname.startsWith("/api/v1/")) api.push(r.url());
        });
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto("/dev/auth-profile/login");
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`login-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        const otp = await requestCode(page);
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`code-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await otp.fill("000123");
        await page.getByRole("button", { name: "Войти", exact: true }).click({ clickCount: 2 });
        await expect(page).toHaveURL(/\/dev\/auth-profile\/profile$/);
        await expect(page.getByText("Проверок кода: 1", { exact: true })).toBeVisible();
        await page.getByRole("checkbox", { name: "Не указывать имя", exact: true }).click();
        await expect(page.getByLabel("Имя", { exact: true })).toBeDisabled();
        await page.getByRole("button", { name: "Сохранить имя", exact: true }).click();
        await expect(page.getByText("Сохранений: 1", { exact: true })).toBeVisible();
        await page.getByRole("checkbox", { name: "Не указывать имя", exact: true }).click();
        await page.getByLabel("Имя", { exact: true }).fill("Анна");
        const save = page.getByRole("button", { name: "Сохранить имя", exact: true });
        await save.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByText("Сохранений: 2", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Завершить сессию 2", exact: true }).click();
        const dialog = page.getByRole("dialog", { name: "Завершить эту сессию?", exact: true });
        await expect(dialog).toBeVisible();
        await expect
          .poll(() =>
            dialog.evaluate((element) => ({
              opacity: getComputedStyle(element).opacity,
              animations: element
                .getAnimations({ subtree: true })
                .filter((animation) => animation.playState === "running").length,
            })),
          )
          .toEqual({ opacity: "1", animations: 0 });
        await dialog.getByRole("button", { name: "Завершить", exact: true }).hover();
        await expect
          .poll(() =>
            dialog.evaluate(
              (element) =>
                element
                  .getAnimations({ subtree: true })
                  .filter((animation) => animation.playState === "running").length,
            ),
          )
          .toBe(0);
        await audit(page);
        if (width === 360 || width === 1440)
          await page.screenshot({
            path: testInfo.outputPath(`confirm-${width}-${colorScheme}.png`),
            fullPage: true,
          });
        await page.keyboard.press("Escape");
        await expect(page.getByRole("heading", { name: "Сессия 2", exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Завершить сессию 2", exact: true }).click();
        await dialog.getByRole("button", { name: "Завершить", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Сессия 2", exact: true })).toHaveCount(0);
        await expect(page.getByRole("heading", { name: "Текущая сессия", exact: true })).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 0));
        await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`profile-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByRole("button", { name: "Выйти", exact: true }).click();
        await expect(page).toHaveURL(/\/dev\/auth-profile\/login$/);
        await expect(page.getByRole("heading", { name: "Профиль и сессии", exact: true })).toHaveCount(0);
        expect(api).toEqual([]);
        expect(errors).toEqual([]);
      });
    });
  }
}

test("a conflict preserves the draft and never resubmits without a decision", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Имя", { exact: true }).fill("Мой вариант");
  await chooseMode(page, "Конфликт профиля");
  await page.getByRole("button", { name: "Сохранить имя", exact: true }).click();
  await expect(page.getByText("Профиль изменён в другой сессии.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Мой вариант");
  await expect(page.getByText("Сохранений: 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Оставить мой вариант", exact: true }).click();
  await expect(page.getByText("Сохранений: 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Сохранить имя", exact: true }).click();
  await expect(page.getByText("Сохранений: 2", { exact: true })).toBeVisible();
});

test("outage keeps the profile and draft; confirmed expiry returns to login", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Имя", { exact: true }).fill("Несохранённое имя");
  await chooseMode(page, "Сбой сети");
  await page.getByRole("button", { name: "Обновить профиль", exact: true }).click();
  await expect(page.getByText(/Показан сохранённый профиль/)).toBeVisible();
  await expect(page).toHaveURL(/\/dev\/auth-profile\/profile$/);
  await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Несохранённое имя");
  await chooseMode(page, "Обычный ответ");
  await page.getByRole("button", { name: "Обновить профиль", exact: true }).click();
  await expect(page.getByText(/Показан сохранённый профиль/)).toHaveCount(0);
  await chooseMode(page, "Сессия истекла");
  await page.getByRole("button", { name: "Обновить профиль", exact: true }).click();
  await expect(page).toHaveURL(/\/dev\/auth-profile\/login$/);
});

for (const target of ["текущую сессию", "все сессии"]) {
  test(`revoking ${target} signs out after confirmation`, async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: `Завершить ${target}`, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: `Завершить ${target}?`, exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Завершить", exact: true }).click();
    await expect(page).toHaveURL(/\/dev\/auth-profile\/login$/);
  });
}

test("absolute challenge expiry survives rerenders and resend creates a fresh empty input", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/dev/auth-profile/login");
  await chooseMode(page, "Короткий срок кода");
  const otp = await requestCode(page);
  await page.clock.runFor(3100);
  await expect(page.getByText("Код истёк — запросите новый.", { exact: true })).toBeVisible();
  await expect(otp).toBeDisabled();
  await chooseMode(page, "Обычный ответ");
  await expect(otp).toBeDisabled();
  await page.getByRole("button", { name: "Отправить код ещё раз", exact: true }).click();
  await expect(otp).toBeEnabled();
  await expect(otp).toHaveValue("");
  await expect(page.getByText("Запросов кода: 2", { exact: true })).toBeVisible();
});

test("rate limit honors its absolute deadline and invalid code remains a field error", async ({ page }) => {
  await page.clock.install();
  await page.goto("/dev/auth-profile/login");
  await chooseMode(page, "Лимит запросов");
  await page.getByLabel("Рабочая почта", { exact: true }).fill("owner@example.test");
  await page.getByRole("button", { name: "Получить код", exact: true }).click();
  await expect(page.getByRole("button", { name: /Повторить через/ })).toBeDisabled();
  await chooseMode(page, "Обычный ответ");
  await expect(page.getByRole("button", { name: /Повторить через/ })).toBeDisabled();
  await page.clock.runFor(3100);
  await page.getByRole("button", { name: "Получить код", exact: true }).click();
  const otp = page.getByRole("textbox", { name: "Код из письма, шесть цифр", exact: true });
  await chooseMode(page, "Неверный код");
  await otp.fill("000123");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByText("Неверный код. Проверьте письмо.", { exact: true })).toBeVisible();
  await expect(otp).toHaveValue("");
  await expect(page).toHaveURL(/\/dev\/auth-profile\/login$/);
  await expect(page.getByText("Проверок кода: 1", { exact: true })).toBeVisible();
});

test("exhausted challenge stays disabled after the rate deadline until a new challenge arrives", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/dev/auth-profile/login");
  await chooseMode(page, "Попытки исчерпаны");
  const otp = await requestCode(page);
  await otp.fill("000123");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(otp).toBeDisabled();
  await chooseMode(page, "Обычный ответ");
  await page.clock.runFor(3100);
  await expect(otp).toBeDisabled();
  await page.getByRole("button", { name: "Отправить код ещё раз", exact: true }).click();
  await expect(otp).toBeEnabled();
  await expect(otp).toHaveValue("");
});

test("server code expiry overrides a still-future client deadline", async ({ page }) => {
  await page.goto("/dev/auth-profile/login");
  await chooseMode(page, "Код просрочен");
  const otp = await requestCode(page);
  await otp.fill("000123");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page.getByText("Код истёк — запросите новый.", { exact: true })).toBeVisible();
  await expect(otp).toBeDisabled();
  await expect(page.getByText(/Код действует ещё/)).toHaveCount(0);
});

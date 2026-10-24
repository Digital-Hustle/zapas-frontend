import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const app = join(root, "apps/web");
const require = createRequire(join(app, "package.json"));
const { chromium, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const scratch = await mkdtemp(join(tmpdir(), "zapas-demo-browser-"));
const evidence = join(root, "test-results/preview-demo");
await mkdir(evidence, { recursive: true });
let server;
let browser;
const results = [];
try {
  for (const [mode, enabled] of [["normal", "0"], ["demo", "1"]]) {
    const built = spawnSync(process.execPath, [join(app, "node_modules/vite/bin/vite.js"), "build", "--outDir", join(scratch, mode), "--emptyOutDir"], { cwd: app, env: { ...process.env, VITE_PREVIEW_MOCKS: enabled, VITE_API_BASE: "" }, encoding: "utf8" });
    assert.equal(built.status, 0, built.stderr || built.error?.message);
    const assets = join(scratch, mode, "assets");
    const scripts = (await Promise.all((await readdir(assets)).filter((f) => f.endsWith(".js")).map((f) => readFile(join(assets, f), "utf8")))).join("\n");
    assert.equal(scripts.includes("preview-only-csrf"), enabled === "1", `${mode}: demo API must follow the flag`);
    assert.equal(scripts.includes("Демо · Кофейня"), enabled === "1", `${mode}: fixture data must follow the flag`);
  }
  server = spawn(process.execPath, [join(app, "node_modules/vite/bin/vite.js"), "preview", "--host", "127.0.0.1", "--port", "5186", "--strictPort", "--outDir", join(scratch, "demo")], { cwd: app, stdio: ["ignore", "pipe", "pipe"] });
  let serverErrors = "";
  server.stdout.resume(); server.stderr.on("data", (chunk) => { serverErrors += chunk; });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) throw new Error(serverErrors || "Preview server stopped");
    try { if ((await fetch("http://127.0.0.1:5186/")).ok) { ready = true; break; } } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "Preview server did not start");
  browser = await chromium.launch({ headless: true });
  for (const width of [360, 768, 1440]) for (const colorScheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: width === 360 ? "no-preference" : "reduce", timezoneId: "Europe/Moscow" });
    const page = await context.newPage();
    const apiRequests = [], errors = [];
    page.on("request", (request) => { if (new URL(request.url()).pathname.startsWith("/api/")) apiRequests.push(request.url()); });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date("2026-10-24T09:00:00Z"));
    const audit = async () => {
      await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined))));
      const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      assert.deepEqual(a11y.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })), []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    };
    const clearToasts = async () => {
      const buttons = page.getByRole("button", { name: "Закрыть уведомление", exact: true });
      while (await buttons.count()) {
        const count = await buttons.count();
        await buttons.last().press("Enter");
        await expect.poll(() => buttons.count()).toBeLessThan(count);
      }
    };
    const login = async () => {
      await page.getByLabel("Рабочая почта", { exact: true }).fill("demo@example.test");
      await page.getByRole("button", { name: "Получить код", exact: true }).click();
      await page.getByRole("textbox", { name: "Код из письма, шесть цифр", exact: true }).fill("000123");
      await page.getByRole("button", { name: "Войти", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Организации и счета", exact: true })).toBeVisible();
    };
    await page.goto("http://127.0.0.1:5186/login");
    await expect(page.getByRole("complementary", { name: "Демонстрационный режим" })).toBeVisible();
    await audit(); await login();
    await page.getByRole("button", { name: "Создать организацию", exact: true }).click();
    await page.getByLabel("Название организации", { exact: true }).fill("Тестовая организация");
    await page.getByRole("dialog").getByRole("button", { name: "Создать организацию", exact: true }).click();
    await expect(page.getByRole("heading", { name: "У организации пока нет счетов", exact: true })).toBeVisible();
    await clearToasts();
    await page.getByRole("button", { name: "Добавить счёт", exact: true }).click();
    await page.getByLabel("Название счёта", { exact: true }).fill("Тестовый счёт");
    await page.getByRole("dialog").getByRole("button", { name: "Добавить счёт", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Выбранный счёт: Тестовый счёт", exact: true })).toBeVisible();
    await clearToasts();
    await page.getByRole("button", { name: "Редактировать счёт", exact: true }).click();
    await page.getByLabel("Название счёта", { exact: true }).fill("Обновлённый счёт");
    await page.getByRole("dialog").getByRole("button", { name: "Сохранить изменения", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Выбранный счёт: Обновлённый счёт", exact: true })).toBeVisible();
    await clearToasts();
    await page.getByRole("button", { name: "Указать остаток", exact: true }).click();
    await page.getByRole("button", { name: "Дата остатка", exact: true }).click();
    await page.getByRole("button", { name: /^.*24 октября/u }).click();
    await page.getByLabel("Остаток, ₽", { exact: true }).fill("-99999999999999999.99");
    await page.getByLabel("Основание", { exact: true }).fill("Тестовый остаток");
    await page.getByLabel("Основание", { exact: true }).press("Tab");
    await audit();
    await page.getByRole("dialog").getByRole("button", { name: "Сохранить остаток", exact: true }).click();
    await expect(page.getByRole("dialog").getByText("Сохранён ручной остаток на 2026-10-24.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Готово", exact: true }).click();
    await clearToasts(); await audit();
    await page.screenshot({ path: join(evidence, `workspace-${width}-${colorScheme}.png`), fullPage: true });
    await page.getByRole("button", { name: "Архивировать счёт", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Архивировать", exact: true }).click();
    await expect(page.getByRole("button", { name: "Редактировать счёт", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Профиль и сессии", exact: true }).click();
    await page.getByLabel("Имя", { exact: true }).fill("Новое демо-имя");
    await page.getByRole("button", { name: "Сохранить имя", exact: true }).click();
    await clearToasts(); await audit();
    await page.getByRole("link", { name: "Пример риска и качества", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Риск и качество — витрина v1", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Пример заданий", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Состояния расчёта — витрина v1", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Сбросить демо", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Вход в Запас", exact: true })).toBeVisible();
    await login();
    await expect(page.getByRole("button", { name: "Выбрать организацию Тестовая организация", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Профиль и сессии", exact: true }).click();
    await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Демо-пользователь");
    await page.getByRole("button", { name: "Выйти", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Вход в Запас", exact: true })).toBeVisible();
    assert.deepEqual(apiRequests, [], "Demo API must not reach the network"); assert.deepEqual(errors, []);
    results.push({ width, colorScheme, API: "memory-only", axe: 0, reset: true });
    await context.close();
  }
  console.log(JSON.stringify({ normalBuildHasMocks: false, demo: results }, null, 2));
} finally {
  await browser?.close(); server?.kill("SIGTERM"); await rm(scratch, { recursive: true, force: true });
}

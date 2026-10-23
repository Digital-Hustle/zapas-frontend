import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import process from "node:process";
import { checkSelectionControls } from "./lib/check-selection-controls.mjs";
import { checkSlidersTabs } from "./lib/check-sliders-tabs.mjs";
const previewUrl = process.env.UI_PREVIEW_URL ?? "http://127.0.0.1:5174/";
const workspace = createRequire(new URL("../apps/web/package.json", import.meta.url));
const { chromium, expect } = workspace("@playwright/test");
const AxeBuilder = workspace("@axe-core/playwright").default;
const browser = await chromium.launch({ headless: true });
const results = [];
const evidence = resolve("test-results/ui");
await mkdir(evidence, { recursive: true });
try {
  for (const width of [360, 768, 1440])
    for (const dark of [false, true])
      for (const reduced of [false, true]) {
        const context = await browser.newContext({
          viewport: { width, height: 1000 },
          reducedMotion: reduced ? "reduce" : "no-preference",
          timezoneId: "Europe/Moscow",
        });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(previewUrl);
        if (dark) await page.getByRole("button", { name: "Тёмная тема", exact: true }).click();
        await checkSelectionControls(page, expect);
        await checkSlidersTabs(page, expect);
        await page.evaluate(() =>
          Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => {}))),
        );
        const fullScan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        assert.deepEqual(
          fullScan.violations.map((violation) => ({
            id: violation.id,
            nodes: violation.nodes.map((node) => node.target),
          })),
          [],
        );
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const select = page.getByRole("combobox", { name: "Категория", exact: true });
        await select.focus();
        await select.press("Enter");
        await expect(page.getByRole("option", { name: "Аренда", exact: true })).toBeFocused();
        await page.waitForFunction(() => {
          const list = document.querySelector('[role="listbox"]');
          return list && getComputedStyle(list).opacity === "1";
        });
        assert.equal(await page.locator("#root").evaluate((el) => el.inert), true);
        const selectScan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        assert.deepEqual(
          selectScan.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
          })),
          [],
        );
        await page.keyboard.press("End");
        await expect(page.getByRole("option", { name: "Налоги", exact: true })).toBeFocused();
        await page.keyboard.press("Enter");
        await page.getByRole("listbox").waitFor({ state: "hidden" });
        assert.match(await select.innerText(), /Налоги/);
        await expect(select).toBeFocused();
        assert.equal(await page.locator("#root").evaluate((el) => el.inert), false);
        const date = page.getByRole("button", { name: "Дата платежа", exact: true });
        await date.click();
        await page.getByRole("dialog").waitFor();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("Enter");
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        assert.match(await page.getByRole("status").innerText(), /2028-02-29/);
        await date.click();
        await page.waitForFunction(() => {
          const d = document.querySelector('[role="dialog"]');
          return d && getComputedStyle(d).opacity === "1";
        });
        const popup = await page.getByRole("dialog").boundingBox();
        assert.ok(popup.x >= 0 && popup.x + popup.width <= width, JSON.stringify(popup));
        const scan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        const violations = scan.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target),
        }));
        assert.deepEqual(violations, []);
        const bg = await page.getByRole("dialog").evaluate((el) => getComputedStyle(el).backgroundColor);
        if (!reduced)
          await page.screenshot({
            path: join(evidence, `${width}-${dark ? "dark" : "light"}.png`),
            fullPage: true,
          });
        await page.keyboard.press("Escape");
        await expect(date).toBeFocused();
        assert.deepEqual(errors, []);
        results.push({ width, dark, reduced, background: bg, axeViolations: violations.length });
        await context.close();
      }
  for (const timezoneId of ["America/Los_Angeles", "Pacific/Kiritimati"]) {
    const context = await browser.newContext({ timezoneId });
    const page = await context.newPage();
    await page.goto(previewUrl);
    await page.getByRole("button", { name: "Дата платежа", exact: true }).click();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    assert.match(await page.getByRole("status").innerText(), /2028-02-29/);
    results.push({ timezoneId, selected: "2028-02-29" });
    await context.close();
  }
  process.stdout.write(JSON.stringify(results, null, 2) + "\n");
} finally {
  await browser.close();
}

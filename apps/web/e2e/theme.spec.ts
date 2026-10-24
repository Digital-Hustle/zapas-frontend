import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function choose(page: Page, name: string) {
  await page.getByRole("button", { name: "Тема", exact: true }).click();
  await page.getByRole("radio", { name, exact: true }).click();
}

test("theme choice is available before login, survives navigation and reload, and follows the system explicitly", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Тема", exact: true });
  await expect(button).toBeVisible();
  await button.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("radio", { name: "Тёмная", exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(button).toBeFocused();
  await page.getByRole("link", { name: "Попробовать бесплатно", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: "Тема", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await choose(page, "Как в системе");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("theme remains usable when storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Unavailable", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Unavailable", "SecurityError");
    };
  });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/");
  await choose(page, "Тёмная");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await choose(page, "Светлая");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("an unsupported stored theme uses the system preference", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("zapas-theme", "obsolete"));
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

for (const width of [360, 768, 1440])
  for (const colorScheme of ["light", "dark"] as const) {
    test(`theme menu ${width}px ${colorScheme}: keyboard, contrast and layout`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme, reducedMotion: width === 360 ? "reduce" : "no-preference" });
      await page.goto("/");
      const button = page.getByRole("button", { name: "Тема", exact: true });
      await expect(button).toBeVisible();
      await button.press("Enter");
      await expect(page.getByRole("dialog", { name: "Цветовая тема", exact: true })).toBeVisible();
      await expect(page.getByRole("radio", { name: "Как в системе", exact: true })).toBeChecked();
      await page.keyboard.press("End");
      await expect(page.getByRole("radio", { name: "Как в системе", exact: true })).toBeFocused();
      const audit = await new AxeBuilder({ page }).analyze();
      expect(audit.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual(
        [],
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `evidence/T-CLIENT-01-theme/menu-${width}-${colorScheme}.png` });
      await page.keyboard.press("Escape");
      await expect(button).toBeFocused();
    });
  }

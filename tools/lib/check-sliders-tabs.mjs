import assert from "node:assert/strict";

export async function checkSlidersTabs(page, expect) {
  const slider = page.getByRole("slider", { name: "Изменение параметра", exact: true });
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuenow", "25");
  await expect(slider).toHaveAttribute("aria-valuetext", "25%");
  await slider.press("Home");
  await expect(slider).toHaveAttribute("aria-valuenow", "0");
  await slider.press("End");
  await expect(slider).toHaveAttribute("aria-valuenow", "100");
  const box = await slider.boundingBox();
  assert.ok(box && box.width >= 44 && box.height >= 44);
  await slider.click();
  await expect(slider).toBeFocused();
  await slider.press("Home");
  const from = page.getByRole("slider", { name: "Нижняя граница", exact: true });
  await from.focus();
  await from.press("ArrowRight");
  await expect(from).toHaveAttribute("aria-valuenow", "15");
  await page.keyboard.press("Tab");
  const to = page.getByRole("slider", { name: "Верхняя граница", exact: true });
  await expect(to).toBeFocused();
  await to.press("ArrowRight");
  await expect(to).toHaveAttribute("aria-valuenow", "45");
  const tabs = page.getByRole("tablist", { name: "Настройки сценария", exact: true });
  await tabs.getByRole("tab", { name: "Параметры", exact: true }).focus();
  await page.keyboard.press("ArrowRight", { delay: 50 });
  await expect(page.getByRole("tabpanel", { name: "Справка", exact: true })).toBeVisible();
  await expect(tabs.getByRole("tab", { name: "Расчёт", exact: true })).toBeDisabled();
  await page.keyboard.press("Home", { delay: 50 });
  await expect(page.getByRole("tabpanel", { name: "Параметры", exact: true })).toBeVisible();
}

import assert from "node:assert/strict";

export async function checkSelectionControls(page, expect) {
  const all = page.getByRole("checkbox", { name: "Все каналы", exact: true });
  await expect(all).toHaveAttribute("aria-checked", "mixed");
  await all.check();
  await expect(page.getByRole("switch", { name: "В приложении", exact: true })).toBeChecked();
  await page.getByRole("switch", { name: "Email-уведомления", exact: true }).uncheck();
  await expect(all).toHaveAttribute("aria-checked", "mixed");
  const delivery = page.getByRole("radio", { name: "Еженедельный дайджест", exact: true });
  await delivery.focus();
  await delivery.press("ArrowDown", { delay: 50 });
  await expect(page.getByRole("radio", { name: "Ежедневно", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "SMS — недоступно", exact: true })).toBeDisabled();
  const horizon = page.getByRole("radiogroup", { name: "Горизонт прогноза", exact: true });
  await horizon.getByRole("radio", { name: "30 дней" }).focus();
  await page.keyboard.press("ArrowRight", { delay: 50 });
  await expect(horizon.getByRole("radio", { name: "60 дней" })).toBeChecked();
  for (const control of await page
    .getByRole("region", { name: "Переключатели и выбор" })
    .getByRole("radio")
    .all()) {
    const box = await control.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44);
  }
}

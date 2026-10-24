import { Buffer } from "node:buffer";

export async function checkFoundations(page, expect, audit = async () => undefined) {
  const area = page.getByRole("region", { name: "Импорт и состояния", exact: true });
  const input = area.locator('input[type="file"]');
  await input.setInputFiles({ name: "bank.csv", mimeType: "text/csv", buffer: Buffer.from("date,amount\n2026-10-24,100.00") });
  await expect(area.getByText("bank.csv", { exact: true })).toBeVisible();
  await input.setInputFiles({ name: "wrong.exe", mimeType: "application/octet-stream", buffer: Buffer.from("wrong") });
  await expect(area.getByText("Неподдерживаемый тип файла.")).toBeVisible();
  await expect(area.getByText("bank.csv", { exact: true })).toBeVisible();
  await area.getByRole("button", { name: "Убрать файл" }).click();
  await expect(area.getByText("bank.csv", { exact: true })).toHaveCount(0);
  await expect(area.getByRole("progressbar", { name: "Обработка выписки" })).toHaveAttribute("aria-valuenow", "35");
  await expect(area.getByText("99 999 999 999 999 999,99 ₽", { exact: false })).toBeVisible();
  const money = area.getByRole("textbox", { name: "Точная сумма платежа", exact: true });
  await money.fill("9007199254740993,01");
  await money.press("Tab");
  await expect(money).toHaveValue(/9[\s\u00a0\u202f]007[\s\u00a0\u202f]199[\s\u00a0\u202f]254[\s\u00a0\u202f]740[\s\u00a0\u202f]993,01/);
  const otp = page.getByRole("region", { name: "Код подтверждения", exact: true });
  await otp.getByRole("textbox", { name: "Код для примера" }).fill("123456");
  await expect(otp.getByTestId("otp-result")).toHaveText("Кодов для примера принято: 1");
  await otp.getByRole("button", { name: "Отправить код ещё раз", exact: true }).click();
  await expect(otp.getByRole("button")).toBeDisabled();
  await expect(otp.getByRole("textbox")).toHaveValue("");
  const buttons = area.getByRole("group", { name: "Варианты кнопок" });
  for (const name of ["Удалить", "Отменить", "Сохранить"]) {
    const button = buttons.getByRole("button", { name, exact: true });
    await button.hover();
    await button.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
    await audit();
  }
}

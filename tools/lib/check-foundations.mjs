import { Buffer } from "node:buffer";

export async function checkFoundations(page, expect) {
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
}

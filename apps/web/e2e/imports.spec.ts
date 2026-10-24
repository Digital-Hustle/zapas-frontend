import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
const companyId = "00000000-0000-4000-8000-000000000001";
const accountId = "00000000-0000-4000-8000-000000000002";
const importId = "00000000-0000-4000-8000-000000000003";
const time = "2026-10-24T09:00:00Z";
const root = `/api/v1/orchestrator/companies/${companyId}`;
const location = `/app/imports?company=${companyId}&account=${accountId}`;
const csv = "operation_id,date,direction,amount\n1,2026-10-24,IN,12.34\n2,2026-10-24,OUT,1.00\n";
function record(id = importId, name = "example.csv") {
  return {
    id,
    companyId,
    accountId,
    status: "COMMITTED",
    fileName: name,
    fileSha256: "a".repeat(64),
    totalRows: 3,
    acceptedRows: 2,
    rejectedRows: 0,
    duplicateRows: 1,
    warningCount: 1,
    fromDate: null as string | null,
    toDate: null as string | null,
    createdAt: time,
    completedAt: time as string | null,
    dataVersion: 1,
  };
}
async function service(page: Page, role = "OWNER", archived = false) {
  const state = {
    role,
    archived,
    reports: [] as ReturnType<typeof record>[],
    calls: [] as { key: string; file: string; name: string; fields: Record<string, string> }[],
    requests: [] as string[],
    problems: [] as string[],
    drop: false,
    rateAfterDrop: false,
    reject: false,
    noResourceId: false,
    listOutage: false,
    reportForbidden: false,
    wrongAccount: false,
    nonterminal: false,
    issueCount: 1,
  };
  const replay = new Map<string, ReturnType<typeof record>>();
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = request.headers();
    const method = request.method();
    state.requests.push(`${method} ${path}`);
    const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
      route.fulfill({ status, headers: extra, contentType: "application/json", body: JSON.stringify(body) });
    const problem = (status: number, code: string, id: string | null = null) =>
      json(
        {
          type: "about:blank",
          title: "Failed",
          status,
          code,
          detail: "private-server-detail",
          traceId: "fixture",
          errors: [],
          retryAfterSec: status === 429 ? 1 : null,
          resourceId: id,
        },
        status,
        status === 429 ? { "Retry-After": "1" } : {},
      );
    const paged = (items: unknown[], size = 10) => {
      const number = Number(new URL(request.url()).searchParams.get("page") ?? "0");
      return json({
        items: items.slice(number * size, (number + 1) * size),
        page: { page: number, size, total: items.length, hasNext: (number + 1) * size < items.length },
      });
    };
    if (["authorization", "x-user-id", "x-auth-session-id", "x-client"].some((key) => headers[key]))
      state.problems.push("unexpected identity header");
    if (path === "/api/v1/auth-profile/profile/me")
      return json({
        id: "00000000-0000-4000-8000-000000000010",
        email: "owner@example.test",
        displayName: null,
        version: 0,
        createdAt: time,
        updatedAt: time,
      });
    if (path === "/api/v1/auth-profile/auth/csrf")
      return json({ token: "modeled-csrf", headerName: "X-CSRF-Token" });
    if (path === root && method === "GET")
      return json({
        id: companyId,
        name: "Компания из примера",
        legalForm: "OOO",
        inn: null,
        kpp: null,
        timezone: "Europe/Moscow",
        myRole: state.role,
        permissions: {
          canEditCompany: state.role === "OWNER",
          canManageMembers: state.role === "OWNER",
          canImport: state.role !== "VIEWER",
          canEditPayments: state.role !== "VIEWER",
          canManagePlans: state.role !== "VIEWER",
          canRunForecast: state.role !== "VIEWER",
          canRunBacktest: state.role !== "VIEWER",
        },
        archived: state.archived,
        version: 1,
      });
    if (path === `${root}/accounts/${accountId}`)
      return json({
        id: accountId,
        companyId,
        name: "Основной счёт",
        bankName: null,
        accountNumber: null,
        externalCompanyId: null,
        currency: "RUB",
        archived: state.archived,
        latestBalance: null,
        latestBalanceDate: null,
        version: 1,
      });
    if (path === "/api/v1/orchestrator/companies") return paged([]);
    if (path === `/api/v1/preprocessor/companies/${companyId}/imports`) {
      if (headers["x-csrf-token"] !== "modeled-csrf") state.problems.push("missing CSRF");
      const key = z.uuid().parse(headers["idempotency-key"]);
      const buffer = request.postDataBuffer();
      if (!buffer) throw new Error("missing fixture multipart body");
      const form = await new Request("https://fixture.invalid", {
        method: "POST",
        headers: { "content-type": headers["content-type"] ?? "" },
        body: Uint8Array.from(buffer).buffer,
      }).formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new Error("missing fixture file part");
      const fields: Record<string, string> = {};
      for (const [key, value] of form.entries()) if (typeof value === "string") fields[key] = value;
      state.calls.push({ key, file: await file.text(), name: file.name, fields });
      if (state.role === "VIEWER") return problem(403, "FORBIDDEN");
      if (state.rateAfterDrop && state.calls.length === 2) return problem(429, "RATE_LIMITED");
      const existing = replay.get(key);
      if (existing) return json(existing);
      const value = {
        ...record(crypto.randomUUID(), file.name),
        status: state.nonterminal ? "STAGING" : state.reject ? "REJECTED" : "COMMITTED",
        acceptedRows: state.reject ? 0 : 2,
        rejectedRows: state.reject || fields.validationMode === "SKIP_INVALID" ? 1 : 0,
      };
      state.reports.unshift(value);
      if (state.reject) return problem(422, "IMPORT_REJECTED", state.noResourceId ? null : value.id);
      replay.set(key, value);
      if (state.drop) {
        state.drop = false;
        return route.abort("failed");
      }
      return json(value, 201);
    }
    if (path === `${root}/imports`)
      return state.listOutage ? problem(503, "DEPENDENCY_UNAVAILABLE") : paged(state.reports);
    const parts = path.slice(`${root}/imports/`.length).split("/");
    const report = state.reports.find(({ id }) => id === parts[0]);
    if (report && parts.length === 1)
      return state.reportForbidden
        ? problem(404, "NOT_FOUND")
        : json(state.wrongAccount ? { ...report, accountId: companyId } : report);
    if (report && parts[1] === "issues")
      return state.reportForbidden
        ? problem(404, "NOT_FOUND")
        : paged(
            Array.from({ length: state.issueCount }, (_, index) => ({
              id: `00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`,
              severity: "WARNING",
              code: "DUPLICATE_CANDIDATE",
              rowNumber: index + 2,
              field: "operation_id",
              message: `<b>Замечание ${index + 1}</b>: проверьте исходную строку`,
            })),
            20,
          );
    state.problems.push(`unexpected endpoint ${method} ${path}`);
    return problem(404, "NOT_FOUND");
  });
  return state;
}
async function chooseFile(page: Page, name = "example.csv", text = csv) {
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(text) });
}
async function audit(page: Page) {
  await expect(page.locator('button[aria-busy="true"]')).toHaveCount(0);
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
}
for (const width of [360, 768, 1440])
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`CSV ${width}px ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 1000 }, colorScheme, reducedMotion: "reduce" });
      test("uploads unknown-completeness CSV through SDK and displays scoped report", async ({
        page,
      }, testInfo) => {
        const state = await service(page);
        await page.goto(location);
        await expect(
          page.getByRole("heading", { name: "Для этого счёта ещё нет импортов", exact: true }),
        ).toBeVisible();
        await expect(page.getByRole("checkbox")).not.toBeChecked();
        await page.getByRole("button", { name: "Выбрать выписку CSV", exact: true }).focus();
        await chooseFile(page);
        const uploadViolations = await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`upload-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        await page.getByRole("button", { name: "Загрузить выписку", exact: true }).focus();
        await page.keyboard.press("Enter");
        const report = page.getByRole("region", { name: "Отчёт импорта", exact: true });
        await expect(report).toContainText("Импорт завершён");
        await expect(report).toContainText("<b>Замечание 1</b>");
        expect(await report.locator("b").count()).toBe(0);
        expect(state.calls).toHaveLength(1);
        expect(state.calls[0]).toMatchObject({
          file: csv,
          name: "example.csv",
          fields: { accountId, validationMode: "ATOMIC", completeness: "UNKNOWN" },
        });
        expect(Object.keys(state.calls[0]?.fields ?? {}).sort()).toEqual([
          "accountId",
          "completeness",
          "validationMode",
        ]);
        const reportViolations = await audit(page);
        await page.screenshot({
          path: testInfo.outputPath(`report-${width}-${colorScheme}.png`),
          fullPage: true,
        });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(state.problems).toEqual([]);
        await testInfo.attach("axe-violations", {
          body: JSON.stringify({ upload: uploadViolations, report: reportViolations }),
          contentType: "application/json",
        });
        expect([...uploadViolations, ...reportViolations]).toEqual([]);
      });
    });
  }

test("a lost upload response and later 429 preserve the exact file, parameters and key", async ({ page }) => {
  const state = await service(page);
  state.drop = true;
  state.rateAfterDrop = true;
  await page.goto(location);
  await chooseFile(page);
  await page.getByRole("button", { name: "Загрузить выписку", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить ту же загрузку", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Выбрать выписку CSV", exact: true })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await page.getByRole("button", { name: "Повторить ту же загрузку", exact: true }).click();
  await expect(page.getByRole("button", { name: /Повторить через/ })).toBeDisabled();
  await page.getByRole("button", { name: "Повторить ту же загрузку", exact: true }).click();
  await expect(page.getByRole("region", { name: "Отчёт импорта", exact: true })).toContainText(
    "Импорт завершён",
  );
  expect(state.calls).toHaveLength(3);
  expect(state.calls[1]).toEqual(state.calls[0]);
  expect(state.calls[2]).toEqual(state.calls[0]);
  expect(state.reports).toHaveLength(1);
  expect(state.problems).toEqual([]);
});

test("422 resourceId opens the rejected report without a second upload", async ({ page }) => {
  const state = await service(page);
  state.reject = true;
  await page.goto(location);
  await chooseFile(page);
  await page.getByRole("button", { name: "Загрузить выписку", exact: true }).click();
  const report = page.getByRole("region", { name: "Отчёт импорта", exact: true });
  await expect(report).toContainText("Импорт отклонён");
  await expect(report).toContainText("<b>Замечание 1</b>");
  expect(await page.locator("body").innerText()).not.toContain("private-server-detail");
  expect(state.calls).toHaveLength(1);
  expect(state.requests.some((request) => request.endsWith(`/imports/${state.reports[0]?.id}/issues`))).toBe(
    true,
  );
});

test("complete period and skipping invalid rows require explicit choices", async ({ page }) => {
  await page.clock.setFixedTime(new Date(time));
  const state = await service(page);
  await page.goto(location);
  await chooseFile(page);
  await page
    .getByRole("radio", { name: "Сохранить корректные строки, пропустить ошибочные", exact: true })
    .click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Загрузить выписку", exact: true }).click();
  await expect(page.getByText("Выберите начало полного периода", { exact: true })).toBeVisible();
  expect(state.calls).toHaveLength(0);
  await page.getByRole("button", { name: "Полный период выписки", exact: true }).click();
  await page.getByRole("button", { name: /(?:^|\D)1 октября/u }).click();
  await page.getByRole("button", { name: /24 октября/u }).click();
  await page.getByRole("button", { name: "Загрузить выписку", exact: true }).click();
  await expect(page.getByRole("region", { name: "Отчёт импорта", exact: true })).toContainText(
    "Сохранены корректные строки",
  );
  expect(state.calls[0]?.fields).toEqual({
    accountId,
    validationMode: "SKIP_INVALID",
    completeness: "CONFIRMED_COMPLETE",
    declaredFromDate: "2026-10-01",
    declaredToDate: "2026-10-24",
  });
});

test("unknown outcome blocks navigation until the user chooses to leave and check history", async ({
  page,
}) => {
  const state = await service(page);
  state.drop = true;
  await page.goto(location);
  await chooseFile(page);
  await page.getByRole("button", { name: "Загрузить выписку", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить ту же загрузку", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "К организации и счёту", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Покинуть импорт?", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Остаться", exact: true }).click();
  await expect(page.getByRole("button", { name: "Повторить ту же загрузку", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "К организации и счёту", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Покинуть импорт?", exact: true });
  await dialog.getByRole("button", { name: "Перейти и проверить историю", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/app/company/${companyId}`));
  expect(state.calls).toHaveLength(1);
});

test("file validation rejects wrong extension and empty files without a request", async ({ page }) => {
  const state = await service(page);
  await page.goto(location);
  await page.getByRole("button", { name: "Загрузить выписку", exact: true }).click();
  await expect(page.getByText("Выберите CSV-файл", { exact: true })).toBeVisible();
  await chooseFile(page, "empty.csv", "");
  expect(state.calls).toHaveLength(0);
  await chooseFile(page, "example.xlsx");
  expect(state.calls).toHaveLength(0);
  await expect(page.getByRole("button", { name: "Загрузить выписку", exact: true })).toBeEnabled();
});

for (const role of ["VIEWER", "ACCOUNTANT"])
  test(`CSV respects ${role} permissions`, async ({ page }) => {
    const state = await service(page, role);
    state.reports.push(record());
    await page.goto(location);
    await expect(page.getByRole("heading", { name: "История импорта", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Загрузить выписку", exact: true })).toHaveCount(
      role === "VIEWER" ? 0 : 1,
    );
    await page.getByRole("button", { name: "Открыть отчёт example.csv", exact: true }).click();
    await expect(page.getByRole("region", { name: "Отчёт импорта", exact: true })).toContainText(
      "Импорт завершён",
    );
    expect(state.calls).toHaveLength(0);
  });

test("history/report pages preserve outage data and hide reports after 404", async ({ page }) => {
  const state = await service(page);
  state.reports.push(record());
  state.issueCount = 21;
  await page.goto(location);
  await page.getByRole("button", { name: "Открыть отчёт example.csv", exact: true }).click();
  const report = page.getByRole("region", { name: "Отчёт импорта", exact: true });
  await expect(
    report.getByText("<b>Замечание 20</b>: проверьте исходную строку", { exact: true }),
  ).toBeVisible();
  await report.getByRole("button", { name: "Далее", exact: true }).click();
  await expect(
    report.getByText("<b>Замечание 21</b>: проверьте исходную строку", { exact: true }),
  ).toBeVisible();
  await expect(
    report.getByText("<b>Замечание 1</b>: проверьте исходную строку", { exact: true }),
  ).toHaveCount(0);
  state.listOutage = true;
  await page.getByRole("button", { name: "Обновить историю", exact: true }).click();
  await expect(page.getByText(/Показаны сохранённые данные/u)).toBeVisible();
  state.reportForbidden = true;
  await report.getByRole("button", { name: "Обновить отчёт", exact: true }).click();
  await expect(report.getByText("Нет доступа к ресурсу", { exact: true })).toBeVisible();
  await expect(report.getByText("Импорт завершён", { exact: true })).toHaveCount(0);
});

test("nonterminal upload response keeps the attempt until an explicit successful replay", async ({
  page,
}) => {
  const state = await service(page);
  state.nonterminal = true;
  await page.goto(location);
  await chooseFile(page);
  await page.getByRole("button", { name: "Загрузить выписку", exact: true }).click();
  await expect(page.getByRole("region", { name: "Отчёт импорта", exact: true })).toContainText(
    "Идёт обработка",
  );
  await expect(page.getByRole("button", { name: "Повторить ту же загрузку", exact: true })).toBeVisible();
  await expect(
    page.getByRole("radio", { name: "Отклонить весь файл при ошибке", exact: true }),
  ).toBeDisabled();
  expect(state.calls).toHaveLength(1);
  Object.assign(state.reports[0] ?? {}, { status: "COMMITTED" });
  await page.getByRole("button", { name: "Повторить ту же загрузку", exact: true }).click();
  await expect(page.getByRole("region", { name: "Отчёт импорта", exact: true })).toContainText(
    "Импорт завершён",
  );
  expect(state.calls[1]).toEqual(state.calls[0]);
});

test("422 without resourceId stays on the form and a corrected attempt receives a new key", async ({
  page,
}) => {
  const state = await service(page);
  state.reject = true;
  state.noResourceId = true;
  await page.goto(location);
  await chooseFile(page);
  await page.getByRole("button", { name: "Загрузить выписку", exact: true }).click();
  await expect(
    page
      .getByRole("main")
      .getByText("Импорт отклонён. Проверьте отчёт об ошибках и исходный файл.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Отчёт импорта", exact: true })).toHaveCount(0);
  expect(state.requests.filter((value) => value.includes("/issues"))).toEqual([]);
  state.reject = false;
  await chooseFile(page, "corrected.csv");
  await page.getByRole("button", { name: "Загрузить выписку", exact: true }).click();
  await expect(page.getByRole("region", { name: "Отчёт импорта", exact: true })).toContainText(
    "Импорт завершён",
  );
  expect(state.calls[1]?.key).not.toBe(state.calls[0]?.key);
  expect(state.calls[1]?.name).toBe("corrected.csv");
});

test("a report from another account is rejected before loading its issues", async ({ page }) => {
  const state = await service(page);
  state.reports.push(record());
  state.wrongAccount = true;
  await page.goto(location);
  await page.getByRole("button", { name: "Открыть отчёт example.csv", exact: true }).click();
  const report = page.getByRole("region", { name: "Отчёт импорта", exact: true });
  await expect(report).toContainText("Сервис вернул данные в неподдерживаемом формате.");
  expect(state.requests.filter((value) => value.endsWith("/issues"))).toEqual([]);
});

test("archived account keeps read-only history without upload controls", async ({ page }) => {
  const state = await service(page, "OWNER", true);
  state.reports.push(record());
  await page.goto(location);
  await expect(page.getByRole("heading", { name: "История импорта", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Загрузить выписку", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Открыть отчёт example.csv", exact: true }).click();
  await expect(page.getByRole("region", { name: "Отчёт импорта", exact: true })).toContainText(
    "Импорт завершён",
  );
});

test("malformed URL scope never calls business endpoints", async ({ page }) => {
  const state = await service(page);
  await page.goto(`/app/imports?company=../other&account=${accountId}`);
  await expect(page.getByText("Выберите организацию и счёт", { exact: true })).toBeVisible();
  expect(
    state.requests.filter((value) => value.includes("orchestrator") || value.includes("preprocessor")),
  ).toEqual([]);
});

test("import history uses server pages without retaining another page's cards", async ({ page }) => {
  const state = await service(page);
  for (let index = 0; index < 11; index++)
    state.reports.push(
      record(`00000000-0000-4000-8000-${String(index + 20).padStart(12, "0")}`, `statement-${index + 1}.csv`),
    );
  await page.goto(location);
  const history = page.getByRole("region", { name: "История импорта", exact: true });
  await expect(history.getByRole("heading", { name: "statement-1.csv", exact: true })).toBeVisible();
  await history.getByRole("button", { name: "Далее", exact: true }).click();
  await expect(history.getByRole("heading", { name: "statement-11.csv", exact: true })).toBeVisible();
  await expect(history.getByRole("heading", { name: "statement-1.csv", exact: true })).toHaveCount(0);
});

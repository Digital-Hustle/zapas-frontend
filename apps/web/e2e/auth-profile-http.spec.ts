import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";

const auth = "/api/v1/auth-profile/auth";
const profilePath = "/api/v1/auth-profile/profile/me";
const userId = "00000000-0000-4000-8000-000000000010";
const sessionId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const challengeId = "00000000-0000-4000-8000-000000000003";
const time = "2026-10-24T09:00:00Z";

/** Contract fixtures at the HTTP boundary exercise the real shared SDK, not a replacement port. */
async function service(page: Page, authenticated = false) {
  const state = {
    authenticated,
    logoutFailure: false,
    needsRefresh: false,
    refreshResult: "ok" as "ok" | "uncertain" | "rejected",
    conflict: false,
    csrf: 0,
    refreshes: 0,
    requests: [] as { path: string; method: string }[],
    saves: [] as unknown[],
    verifies: [] as unknown[],
    issues: [] as string[],
    profile: {
      id: userId,
      email: "owner@example.test",
      displayName: null as string | null,
      version: 0,
      createdAt: time,
      updatedAt: time,
    },
    sessions: [sessionId, otherId].map((id) => ({
      id,
      current: id === sessionId,
      createdAt: time,
      lastSeenAt: time,
      expiresAt: "2026-11-24T09:00:00Z",
    })),
  };
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const method = request.method();
    const headers = request.headers();
    state.requests.push({ path, method });
    const json = (value: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify(value),
      });
    const problem = (code: string, status: number) =>
      route.fulfill({
        status,
        contentType: "application/problem+json",
        body: JSON.stringify({
          type: "about:blank",
          title: "Request failed",
          status,
          code,
          detail: "private-server-text",
          instance: path,
          traceId: "fixture",
          errors: [],
        }),
      });
    const session = () => ({
      sessionId,
      accessExpiresAt: "2026-10-24T10:00:00Z",
      refreshExpiresAt: "2026-11-24T09:00:00Z",
      user: state.profile,
    });
    if (
      ["x-client", "x-user-id", "x-session-id", "x-company-id", "authorization"].some((key) => headers[key])
    )
      state.issues.push("unexpected identity header");
    if (!path.startsWith("/api/v1/auth-profile/")) {
      state.issues.push(`unexpected namespace ${path}`);
      return problem("NOT_FOUND", 404);
    }
    if (method !== "GET" && headers["x-csrf-token"] !== "modeled-csrf")
      state.issues.push("missing CSRF binding");
    if (path === `${auth}/csrf`) {
      state.csrf += 1;
      return json({ token: "modeled-csrf", headerName: "X-CSRF-Token" });
    }
    if (path === `${auth}/code`)
      return json(
        {
          challengeId,
          codeLength: 6,
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 60000).toISOString(),
        },
        202,
      );
    if (path === `${auth}/verify`) {
      state.verifies.push(request.postDataJSON());
      state.authenticated = true;
      return json(session());
    }
    if (path === `${auth}/refresh`) {
      state.refreshes += 1;
      if (state.refreshResult === "uncertain") return problem("DEPENDENCY_UNAVAILABLE", 503);
      if (state.refreshResult === "rejected") {
        state.authenticated = false;
        return problem("REFRESH_INVALID", 401);
      }
      state.needsRefresh = false;
      return json(session());
    }
    if (path === `${auth}/logout`) {
      if (state.logoutFailure) return problem("DEPENDENCY_UNAVAILABLE", 503);
      state.authenticated = false;
      return route.fulfill({ status: 204 });
    }
    if (!state.authenticated || state.needsRefresh) return problem("AUTHENTICATION_REQUIRED", 401);
    if (path === profilePath && method === "GET") return json(state.profile);
    if (path === profilePath && method === "PUT") {
      const raw: unknown = request.postDataJSON();
      const body = z.object({ displayName: z.string(), version: z.number() }).strict().parse(raw);
      state.saves.push(body);
      if (state.conflict) {
        state.conflict = false;
        state.profile = { ...state.profile, displayName: "Имя из другой сессии", version: 1 };
        return problem("PROFILE_VERSION_CONFLICT", 409);
      }
      if (body.version !== state.profile.version) return problem("PROFILE_VERSION_CONFLICT", 409);
      state.profile = { ...state.profile, displayName: body.displayName, version: state.profile.version + 1 };
      return json(state.profile);
    }
    if (path === `${auth}/sessions` && method === "GET")
      return json({ items: state.sessions, total: state.sessions.length });
    if (path.startsWith(`${auth}/sessions`) && method === "DELETE") {
      const target = path === `${auth}/sessions` ? null : path.split("/").at(-1);
      state.sessions = target === null ? [] : state.sessions.filter(({ id }) => id !== target);
      if (target === null || target === sessionId) state.authenticated = false;
      return route.fulfill({ status: 204 });
    }
    state.issues.push(`unhandled endpoint ${method} ${path}`);
    return problem("NOT_FOUND", 404);
  });
  return state;
}

test("real SDK login preserves leading zeroes, handles profile conflict and rebinds CSRF after revocation", async ({
  page,
}) => {
  const state = await service(page);
  await page.goto("/login");
  await page.getByLabel("Рабочая почта", { exact: true }).fill("owner@example.test");
  await page.getByRole("button", { name: "Получить код", exact: true }).click({ clickCount: 2 });
  await page.getByRole("textbox", { name: "Код из письма, шесть цифр", exact: true }).fill("000123");
  await page.getByRole("button", { name: "Войти", exact: true }).click({ clickCount: 2 });
  await expect(page).toHaveURL(/\/app$/);
  expect(state.verifies).toEqual([{ challengeId, code: "000123" }]);
  await page.getByRole("link", { name: "Профиль и сессии", exact: true }).click();
  await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("");
  state.conflict = true;
  await page.getByLabel("Имя", { exact: true }).fill("Мой вариант");
  await page.getByRole("button", { name: "Сохранить имя", exact: true }).click();
  await expect(page.getByText("Сейчас в профиле:")).toContainText("Имя из другой сессии");
  await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Мой вариант");
  await page.getByRole("button", { name: "Оставить мой вариант", exact: true }).click();
  expect(state.saves).toHaveLength(1);
  await page.getByRole("button", { name: "Сохранить имя", exact: true }).click();
  await expect.poll(() => state.profile.displayName).toBe("Мой вариант");
  expect(state.saves).toEqual([
    { displayName: "Мой вариант", version: 0 },
    { displayName: "Мой вариант", version: 1 },
  ]);
  await page.getByRole("button", { name: "Завершить сессию 2", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Завершить", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Сессия 2", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Вход в Запас", exact: true })).toBeVisible();
  expect(state.csrf).toBe(2);
  expect(state.refreshes).toBe(0);
  expect(state.requests.at(-1)).toEqual({ path: `${auth}/logout`, method: "POST" });
  expect(state.issues).toEqual([]);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) => /token|auth|session|csrf/iu.test(key)),
    ),
  ).toEqual([]);
});

test("a failed logout restores the existing form and keeps its draft", async ({ page }) => {
  const state = await service(page, true);
  await page.goto("/app/profile");
  await page.getByLabel("Имя", { exact: true }).fill("Черновик после сбоя выхода");
  state.logoutFailure = true;
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page.getByRole("button", { name: "Выйти", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Черновик после сбоя выхода");
  await expect(
    page.getByRole("alert").filter({ hasText: "Сервис временно недоступен." }).first(),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/app\/profile$/);
  state.logoutFailure = false;
  await page.getByRole("button", { name: "Сохранить имя", exact: true }).click();
  await expect.poll(() => state.profile.displayName).toBe("Черновик после сбоя выхода");
  expect(state.issues).toEqual([]);
});

for (const target of ["текущую сессию", "все сессии"]) {
  test(`real SDK revokes ${target} without a refresh from the outgoing page`, async ({ page }) => {
    const state = await service(page, true);
    await page.goto("/app/profile");
    await page.getByRole("button", { name: `Завершить ${target}`, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Завершить", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Вход в Запас", exact: true })).toBeVisible();
    expect(state.refreshes).toBe(0);
    expect(state.requests.at(-1)?.method).toBe("DELETE");
    expect(state.issues).toEqual([]);
  });
}

test("uncertain refresh preserves the draft, stops automatic rotation and recovers only on user action", async ({
  page,
}) => {
  const state = await service(page, true);
  await page.goto("/app/profile");
  await expect(page.getByRole("heading", { name: "Ваши сессии", exact: true })).toBeVisible();
  await page.getByLabel("Имя", { exact: true }).fill("Несохранённый вариант");
  state.needsRefresh = true;
  state.refreshResult = "uncertain";
  await page.getByRole("button", { name: "Сохранить имя", exact: true }).click();
  const profile = page.getByRole("region", { name: "Ваш профиль", exact: true });
  await expect(profile.getByRole("button", { name: "Обновить сессию", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Несохранённый вариант");
  expect(state.refreshes).toBe(1);
  await page.getByRole("button", { name: "Сохранить имя", exact: true }).click();
  await expect(profile.getByRole("button", { name: "Обновить сессию", exact: true })).toBeEnabled();
  expect(state.refreshes).toBe(1);
  state.refreshResult = "ok";
  await profile.getByRole("button", { name: "Обновить сессию", exact: true }).click();
  await expect(profile.getByText("Сессия обновлена. Проверьте форму и сохраните имя ещё раз.")).toBeVisible();
  expect(state.refreshes).toBe(2);
  expect(state.saves).toHaveLength(0);
  await expect(page.getByLabel("Имя", { exact: true })).toHaveValue("Несохранённый вариант");
  await page.getByRole("button", { name: "Сохранить имя", exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(1);
  expect(state.saves).toEqual([{ displayName: "Несохранённый вариант", version: 0 }]);
  expect(state.issues).toEqual([]);
});

test("confirmed refresh rejection clears the private screen and sends the user to login", async ({
  page,
}) => {
  const state = await service(page, true);
  await page.goto("/app/profile");
  await expect(page.getByLabel("Имя", { exact: true })).toBeVisible();
  state.needsRefresh = true;
  state.refreshResult = "rejected";
  await page.getByRole("button", { name: "Обновить профиль", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Профиль и сессии", exact: true })).toHaveCount(0);
  expect(state.refreshes).toBe(1);
  expect(state.issues).toEqual([]);
});

import { afterEach, expect, test, vi } from "vitest";
import { requestCode, verifyCode } from "../src/generated/auth-profile.ts";
import { getDashboard } from "../src/generated/orchestrator.ts";
import { uploadStatement } from "../src/generated/preprocessor.ts";
import { queryClient } from "../src/query.ts";

vi.mock("@zapas/ui", () => ({ notify: { error: vi.fn(), warning: vi.fn() } }));
const json = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
const fetchMock = vi.fn<typeof fetch>();
afterEach(() => {
  vi.unstubAllGlobals();
  queryClient.clear();
});

test("Auth/Profile codegen uses one public prefix and its bootstrap-bound browser transport", async () => {
  fetchMock
    .mockReset()
    .mockImplementation((url) =>
      Promise.resolve(
        json(
          url === "/api/v1/auth-profile/auth/csrf"
            ? { token: "binding", headerName: "X-CSRF-Token" }
            : { challengeId: "11111111-1111-4111-8111-111111111111", codeLength: 6 },
        ),
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  await requestCode({ email: "person@example.com" });
  const [url, options] = fetchMock.mock.calls.at(-1) ?? [];
  expect(url).toBe("/api/v1/auth-profile/auth/code");
  expect(new Headers(options?.headers).get("X-CSRF-Token")).toBe("binding");
  expect(options?.credentials).toBe("include");
});

test("generated dashboard binds the company path and explicit account filter", async () => {
  fetchMock.mockReset().mockResolvedValue(json({ accountId: "account" }));
  vi.stubGlobal("fetch", fetchMock);
  await getDashboard("11111111-1111-4111-8111-111111111111", {
    accountId: "22222222-2222-4222-8222-222222222222",
  });
  const [url] = fetchMock.mock.calls.at(-1) ?? [];
  expect(url).toBe(
    "/api/v1/orchestrator/companies/11111111-1111-4111-8111-111111111111/dashboard?accountId=22222222-2222-4222-8222-222222222222",
  );
});

test("generated CSV upload retains idempotency and leaves the multipart boundary to fetch", async () => {
  fetchMock
    .mockReset()
    .mockImplementation((url) =>
      Promise.resolve(
        json(
          url === "/api/v1/auth-profile/auth/csrf"
            ? { token: "binding", headerName: "X-CSRF-Token" }
            : { state: "COMMITTED" },
        ),
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  await uploadStatement(
    "company",
    {
      file: new Blob(["date;amount"]),
      accountId: "account",
      validationMode: "ATOMIC",
      completeness: "UNKNOWN",
    },
    { "Idempotency-Key": "11111111-1111-4111-8111-111111111111" },
  );
  const [url, options] = fetchMock.mock.calls.at(-1) ?? [];
  expect(url).toBe("/api/v1/preprocessor/companies/company/imports");
  expect(options?.body).toBeInstanceOf(FormData);
  const headers = new Headers(options?.headers);
  expect(headers.has("Content-Type")).toBe(false);
  expect(headers.get("Idempotency-Key")).toBe("11111111-1111-4111-8111-111111111111");
});

test("a successful new login clears private query data from the previous identity", async () => {
  queryClient.setQueryData(["private", "previous-user"], { account: "private" });
  fetchMock
    .mockReset()
    .mockImplementation((url) =>
      Promise.resolve(
        json(
          url === "/api/v1/auth-profile/auth/csrf"
            ? { token: "binding", headerName: "X-CSRF-Token" }
            : { sessionId: "new-session" },
        ),
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  await verifyCode({ challengeId: "11111111-1111-4111-8111-111111111111", code: "012345" });
  expect(queryClient.getQueryData(["private", "previous-user"])).toBeUndefined();
});

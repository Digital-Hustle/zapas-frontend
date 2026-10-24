import { expect, it, vi } from "vitest";
import { z } from "zod";
import { createPreviewFetch, DEMO_CODE } from "./api.ts";
const companyRs = z.object({ id: z.uuid(), inn: z.string().nullable(), archived: z.boolean() });
const companiesRs = z.object({ items: z.array(companyRs) });
const accountRs = z.object({
  id: z.uuid(),
  latestBalance: z.string().nullable(),
  latestBalanceDate: z.string().nullable(),
});
const accountsRs = z.object({ items: z.array(accountRs) });
async function read<T>(schema: z.ZodType<T>, response: Promise<Response>) {
  const value: unknown = await (await response).json();
  return schema.parse(value);
}

const origin = "https://preview.example.test";
const auth = "/api/v1/auth-profile/auth";
const root = "/api/v1/orchestrator/companies";
function fixture() {
  const network = vi.fn<typeof fetch>().mockResolvedValue(new Response("asset"));
  const fetcher = createPreviewFetch(network, origin);
  let csrf = "";
  const request = (path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) =>
    fetcher(origin + path, {
      method,
      headers: { "X-CSRF-Token": csrf, ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const login = async () => {
    csrf = (await read(z.object({ token: z.string() }), request(`${auth}/csrf`))).token;
    const challenge = await read(
      z.object({ challengeId: z.uuid() }),
      request(`${auth}/code`, "POST", { email: "real-looking@example.test" }),
    );
    expect(
      (await request(`${auth}/verify`, "POST", { challengeId: challenge.challengeId, code: DEMO_CODE }))
        .status,
    ).toBe(200);
  };
  return { network, fetcher, request, login };
}
it("never forwards API requests, including unknown or external APIs, and preserves asset requests", async () => {
  const f = fixture();
  expect((await f.request("/api/v1/unknown")).status).toBe(503);
  expect((await f.fetcher("https://backend.example.test/api/v1/private")).status).toBe(503);
  expect(f.network).not.toHaveBeenCalled();
  await f.fetcher(origin + "/assets/app.js");
  expect(f.network).toHaveBeenCalledOnce();
});
it("enforces demo CSRF/challenge codes and discards entered contact data", async () => {
  const f = fixture();
  expect((await f.request(`${auth}/code`, "POST", { email: "demo@example.test" })).status).toBe(403);
  await f.login();
  const profile = await read(z.object({ email: z.email() }), f.request("/api/v1/auth-profile/profile/me"));
  expect(profile.email).toBe("demo@example.test");
  expect(f.network).not.toHaveBeenCalled();
});
it("keeps POST replay stable, rejects changed payloads and preserves string identifiers", async () => {
  const f = fixture();
  await f.login();
  const value = { name: "Демо", legalForm: "OOO", inn: "0012345678", kpp: null, timezone: "Europe/Moscow" };
  const headers = { "Idempotency-Key": crypto.randomUUID() };
  const first = await read(companyRs, f.request(root, "POST", value, headers));
  const second = await read(companyRs, f.request(root, "POST", value, headers));
  expect(second).toEqual(first);
  expect(first.inn).toBe(value.inn);
  expect((await f.request(root, "POST", { ...value, name: "Другой" }, headers)).status).toBe(409);
  expect(
    (await read(companiesRs, f.request(root))).items.filter((c: { id: string }) => c.id === first.id),
  ).toHaveLength(1);
});
it("enforces If-Match, company scope, viewer permissions and archived reads", async () => {
  const f = fixture();
  await f.login();
  const { items } = await read(companiesRs, f.request(root));
  const owner = companyRs.parse(items[0]);
  const viewer = companyRs.parse(items[1]);
  const accounts = (await read(accountsRs, f.request(`${root}/${owner.id}/accounts`))).items;
  const selectedAccount = accountRs.parse(accounts[0]);
  expect((await f.request(`${root}/${viewer.id}/accounts/${selectedAccount.id}`)).status).toBe(404);
  expect((await f.request(`${root}/${viewer.id}`, "PUT", {}, { "If-Match": '"1"' })).status).toBe(403);
  expect((await f.request(`${root}/${owner.id}`, "PUT", {}, { "If-Match": '"9"' })).status).toBe(409);
  const key = { "Idempotency-Key": crypto.randomUUID(), "If-Match": '"1"' };
  const archived = await read(companyRs, f.request(`${root}/${owner.id}/archive`, "POST", undefined, key));
  expect(archived.archived).toBe(true);
  expect(await read(companyRs, f.request(`${root}/${owner.id}/archive`, "POST", undefined, key))).toEqual(
    archived,
  );
  expect((await f.request(`${root}/${owner.id}`)).status).toBe(200);
});
it("preserves exact negative and zero anchors and never replaces a newer balance with an older anchor", async () => {
  const f = fixture();
  await f.login();
  const company = companyRs.parse((await read(companiesRs, f.request(root))).items[0]);
  const account = accountRs.parse(
    (await read(accountsRs, f.request(`${root}/${company.id}/accounts`))).items[0],
  );
  const path = `${root}/${company.id}/accounts/${account.id}`;
  const post = (balance: string, date: string) =>
    f.request(
      path + "/balance-anchors",
      "POST",
      { date, balance, reason: "Демо" },
      { "Idempotency-Key": crypto.randomUUID() },
    );
  const negative = "-99999999999999999.99";
  await post(negative, z.string().parse(account.latestBalanceDate));
  expect((await read(accountRs, f.request(path))).latestBalance).toBe(negative);
  await post("0.00", "2000-01-01");
  expect((await read(accountRs, f.request(path))).latestBalance).toBe(negative);
  await post("0.00", z.string().parse(account.latestBalanceDate));
  expect((await read(accountRs, f.request(path))).latestBalance).toBe("0.00");
  expect((await post("1.00", "2999-01-01")).status).toBe(400);
});
it("session revocation and a new preview instance cannot retain another session's private state", async () => {
  const f = fixture();
  await f.login();
  expect((await f.request(`${auth}/sessions`, "DELETE")).status).toBe(204);
  expect((await f.request(`${auth}/refresh`, "POST")).status).toBe(401);
  expect((await f.request(root)).status).toBe(401);
  expect((await fixture().request(root)).status).toBe(401);
});

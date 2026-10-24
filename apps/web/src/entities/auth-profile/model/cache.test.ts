import { expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { resetPrivateSession } from "./cache.ts";

it("removes previous company data when another user signs in", async () => {
  const client = new QueryClient();
  client.setQueryData(["company", "old", "payments"], ["private-finance"]);
  const profile = { id: "user-b", email: "b@example.test", displayName: null, version: 0 };
  await resetPrivateSession(client, profile);
  expect(client.getQueryData(["company", "old", "payments"])).toBeUndefined();
  expect(client.getQueryData(["auth-profile", "me"])).toEqual(profile);
  client.clear();
});

it("removes profile, sessions and cached financial data on confirmed logout", async () => {
  const client = new QueryClient();
  client.setQueryData(["auth-profile", "me"], "private-profile");
  client.setQueryData(["auth-profile", "sessions"], ["private-session"]);
  client.setQueryData(["calculation", "company-a", "account-a", "job-a"], "private-job");
  await resetPrivateSession(client, null);
  expect(client.getQueryCache().getAll()).toHaveLength(0);
});

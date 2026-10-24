import type { QueryClient } from "@tanstack/react-query";
import { profileKeys } from "../api/queries.ts";
import type { AuthProfile } from "./types.ts";

export async function resetPrivateSession(client: QueryClient, profile: AuthProfile | null) {
  await client.cancelQueries();
  client.clear();
  if (profile) client.setQueryData(profileKeys.profile, profile);
}

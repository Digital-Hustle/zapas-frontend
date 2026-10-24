import { refreshBrowserSession } from "@zapas/api";
import {
  getMe,
  getSessions,
  logout,
  requestCode,
  revokeAllSessions,
  revokeSession,
  updateMe,
  verifyCode,
} from "@zapas/api/auth-profile";
import { z } from "zod";
import { AuthProblem } from "../model/errors.ts";
import { emailSchema, otpSchema, profileSchema } from "../model/schemas.ts";
import type { AuthProfilePort } from "../model/types.ts";
import { mapAuthFailure, mapChallenge, mapProfile, mapSessions } from "./mapper.ts";

// UI owns persistent messages/notifications. The shared SDK still owns HTTP/CSRF/cookies/refresh.
const quiet: RequestInit & { silent: true } = { silent: true };
const id = z.uuid();
async function mapped<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AuthProblem(mapAuthFailure(error));
  }
}
export const browserAuthPort: AuthProfilePort = {
  requestChallenge: (email) =>
    mapped(async () => mapChallenge(await requestCode({ email: emailSchema.parse(email) }, quiet))),
  verifyChallenge: (challengeId, code) =>
    mapped(async () => {
      const result = await verifyCode(
        { challengeId: id.parse(challengeId), code: otpSchema.parse(code) },
        quiet,
      );
      return { profile: mapProfile(result.user), sessionId: id.parse(result.sessionId) };
    }),
  readProfile: (signal) => mapped(async () => mapProfile(await getMe({ ...quiet, signal }))),
  saveProfile: (value) => mapped(async () => mapProfile(await updateMe(profileSchema.parse(value), quiet))),
  readSessions: (signal) => mapped(async () => mapSessions(await getSessions({ ...quiet, signal }))),
  revokeSession: (sessionId) => mapped(() => revokeSession(id.parse(sessionId), quiet)),
  revokeAllSessions: () => mapped(() => revokeAllSessions(quiet)),
  logout: () => mapped(() => logout(quiet)),
  recoverSession: () =>
    mapped(async () => {
      await refreshBrowserSession();
    }),
};

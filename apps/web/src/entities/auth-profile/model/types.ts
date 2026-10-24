export interface AuthProfile {
  id: string;
  email: string;
  displayName: string | null;
  version: number;
}

export interface LoginChallenge {
  id: string;
  expiresAt: number;
  resendAt: number;
}

export interface BrowserSession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
}

export type AuthFailureKind =
  | "code-invalid"
  | "code-expired"
  | "code-attempts-exceeded"
  | "rate-limit"
  | "offline"
  | "refresh-uncertain"
  | "unavailable"
  | "session-expired"
  | "session-not-found"
  | "profile-conflict"
  | "validation"
  | "unknown";

export interface AuthIssue {
  kind: AuthFailureKind;
  message: string;
  retryAt?: number;
  fields?: Readonly<Record<string, string>>;
}

export interface AuthProfilePort {
  requestChallenge: (email: string) => Promise<LoginChallenge>;
  verifyChallenge: (
    challengeId: string,
    code: string,
  ) => Promise<{ profile: AuthProfile; sessionId: string }>;
  readProfile: (signal: AbortSignal) => Promise<AuthProfile>;
  saveProfile: (value: { displayName: string; version: number }) => Promise<AuthProfile>;
  readSessions: (signal: AbortSignal) => Promise<readonly BrowserSession[]>;
  revokeSession: (id: string) => Promise<void>;
  revokeAllSessions: () => Promise<void>;
  logout: () => Promise<void>;
  recoverSession: () => Promise<void>;
}

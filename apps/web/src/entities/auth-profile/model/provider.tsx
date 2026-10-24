import type { ReactNode } from "react";
import { AuthContext } from "./context.ts";
import type { AuthProfilePort } from "./types.ts";

export function AuthProfileProvider({ port, children }: { port: AuthProfilePort; children: ReactNode }) {
  return <AuthContext.Provider value={port}>{children}</AuthContext.Provider>;
}

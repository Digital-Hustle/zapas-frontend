import { useMemo, useState, type ReactNode } from "react";
import { AuthContext } from "./context.ts";
import type { AuthProfilePort } from "./types.ts";

export function AuthProfileProvider({ port, children }: { port: AuthProfilePort; children: ReactNode }) {
  const [privateQueries, setPrivateQueries] = useState(true);
  const value = useMemo(() => ({ port, privateQueries, setPrivateQueries }), [port, privateQueries]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

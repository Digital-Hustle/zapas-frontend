import { createContext, useContext } from "react";
import type { AuthProfilePort } from "./types.ts";
export const AuthContext = createContext<AuthProfilePort | null>(null);
export const useAuthPort = () => useContext(AuthContext);

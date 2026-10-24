import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { AuthProfilePort } from "./types.ts";
export const AuthContext = createContext<{
  port: AuthProfilePort | null;
  privateQueries: boolean;
  setPrivateQueries: Dispatch<SetStateAction<boolean>>;
}>({ port: null, privateQueries: false, setPrivateQueries: () => undefined });
export const useAuthPort = () => useContext(AuthContext).port;
export const usePrivateQueries = () => useContext(AuthContext);

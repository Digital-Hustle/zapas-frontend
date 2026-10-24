import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Field, Select } from "@zapas/ui";
import {
  AuthProblem,
  AuthProfileProvider,
  type AuthProfile,
  type AuthProfilePort,
  type BrowserSession,
} from "@/entities/auth-profile";
import { LoginPage } from "@/pages/login";
import { ProfilePage } from "@/pages/profile";
import { RequireAuth } from "../layouts/RequireAuth.tsx";

const currentSession = "00000000-0000-4000-8000-000000000001";
const exampleProfile: AuthProfile = {
  id: "00000000-0000-4000-8000-000000000010",
  email: "owner@example.test",
  displayName: "Владелец",
  version: 0,
};
const sessions: BrowserSession[] = [
  {
    id: currentSession,
    current: true,
    createdAt: "2026-10-24T09:00:00Z",
    lastSeenAt: "2026-10-24T09:30:00Z",
    expiresAt: "2026-11-24T09:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    current: false,
    createdAt: "2026-10-23T10:00:00Z",
    lastSeenAt: "2026-10-23T10:30:00Z",
    expiresAt: "2026-11-23T10:00:00Z",
  },
];
const run = <T,>(action: () => T) => Promise.resolve().then(action);

export function AuthProfilePreview() {
  const navigate = useNavigate();
  const [client] = useState(() => new QueryClient());
  const backend = useRef({
    mode: "normal",
    authenticated: false,
    challenge: "",
    challenges: 0,
    saves: 0,
    verifies: 0,
    conflictInjected: false,
    profile: { ...exampleProfile },
    sessions: [...sessions],
  });
  const [mode, setMode] = useState("normal");
  const [stats, setStats] = useState({ challenges: 0, saves: 0, verifies: 0 });
  useEffect(
    () => () => {
      void client.cancelQueries();
      client.clear();
    },
    [client],
  );
  const port = useMemo<AuthProfilePort>(() => {
    const state = backend.current;
    const emit = () => {
      setStats({ challenges: state.challenges, saves: state.saves, verifies: state.verifies });
    };
    const dependency = () => {
      if (state.mode === "offline")
        throw new AuthProblem({ kind: "offline", message: "Нет соединения с сервером." });
      if (state.mode === "unavailable")
        throw new AuthProblem({ kind: "unavailable", message: "Сервис временно недоступен." });
    };
    const authenticated = () => {
      dependency();
      if (!state.authenticated || state.mode === "session-expired")
        throw new AuthProblem({ kind: "session-expired", message: "Сессия закончилась. Войдите снова." });
    };
    return {
      requestChallenge: () =>
        run(() => {
          dependency();
          state.challenges += 1;
          emit();
          if (state.mode === "limited")
            throw new AuthProblem({
              kind: "rate-limit",
              message: "Слишком много запросов. Повторите позже.",
              retryAt: Date.now() + 3000,
            });
          state.challenge = `00000000-0000-4000-8000-${String(state.challenges).padStart(12, "0")}`;
          return {
            id: state.challenge,
            expiresAt: Date.now() + (state.mode === "short" ? 3000 : 300000),
            resendAt: Date.now() + 1000,
          };
        }),
      verifyChallenge: (id, code) =>
        run(() => {
          dependency();
          state.verifies += 1;
          emit();
          if (state.mode === "attempts")
            throw new AuthProblem({
              kind: "code-attempts-exceeded",
              message: "Попытки для этого кода закончились — запросите новый.",
              retryAt: Date.now() + 3000,
            });
          if (id !== state.challenge || !/^[0-9]{6}$/u.test(code) || state.mode === "invalid")
            throw new AuthProblem({ kind: "code-invalid", message: "Неверный код. Проверьте письмо." });
          if (state.mode === "expired")
            throw new AuthProblem({ kind: "code-expired", message: "Код истёк — запросите новый." });
          state.authenticated = true;
          state.challenge = "";
          state.sessions = [...sessions];
          return { profile: { ...state.profile }, sessionId: currentSession };
        }),
      readProfile: (signal) =>
        run(() => {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          authenticated();
          return { ...state.profile };
        }),
      saveProfile: (value) =>
        run(() => {
          authenticated();
          state.saves += 1;
          emit();
          if (state.mode === "conflict" && !state.conflictInjected) {
            state.conflictInjected = true;
            state.profile = {
              ...state.profile,
              displayName: "Имя из другой сессии",
              version: state.profile.version + 1,
            };
            throw new AuthProblem({ kind: "profile-conflict", message: "Профиль изменён в другой сессии." });
          }
          if (value.version !== state.profile.version)
            throw new AuthProblem({ kind: "profile-conflict", message: "Профиль изменён в другой сессии." });
          state.profile = {
            ...state.profile,
            displayName: value.displayName,
            version: state.profile.version + 1,
          };
          return { ...state.profile };
        }),
      readSessions: (signal) =>
        run(() => {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          authenticated();
          return state.sessions.map((session) => ({ ...session }));
        }),
      revokeSession: (id) =>
        run(() => {
          authenticated();
          if (!state.sessions.some((session) => session.id === id))
            throw new AuthProblem({
              kind: "session-not-found",
              message: "Сессия уже отсутствует. Обновите список.",
            });
          state.sessions = state.sessions.filter((session) => session.id !== id);
          if (id === currentSession) state.authenticated = false;
        }),
      revokeAllSessions: () =>
        run(() => {
          authenticated();
          state.sessions = [];
          state.authenticated = false;
        }),
      logout: () =>
        run(() => {
          dependency();
          state.authenticated = false;
          state.sessions = state.sessions.filter((session) => !session.current);
        }),
    };
  }, []);
  return (
    <QueryClientProvider client={client}>
      <AuthProfileProvider port={port}>
        <aside aria-label="Dev-проверка Auth/Profile" className="border-border bg-muted border-b">
          <div className="max-w-content mx-auto flex flex-wrap items-end justify-between gap-4 px-6 py-4">
            <div className="max-w-xl">
              <p className="text-primary-soft-foreground font-medium">Смоделированный пример</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Только для разработки. API не вызывается; OTP не выдаётся. Проверяется UI, а не серверная
                защита.
              </p>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-3 text-xs">
                <span>Запросов кода: {stats.challenges}</span>
                <span>Проверок кода: {stats.verifies}</span>
                <span>Сохранений: {stats.saves}</span>
              </div>
            </div>
            <div className="w-full max-w-sm">
              <Field label="Ответ сервиса" htmlFor="auth-mode">
                <Select
                  id="auth-mode"
                  value={mode}
                  onValueChange={(value) => {
                    backend.current.mode = value;
                    backend.current.conflictInjected = false;
                    setMode(value);
                  }}
                  options={[
                    { value: "normal", label: "Обычный ответ" },
                    { value: "invalid", label: "Неверный код" },
                    { value: "expired", label: "Код просрочен" },
                    { value: "attempts", label: "Попытки исчерпаны" },
                    { value: "short", label: "Короткий срок кода" },
                    { value: "limited", label: "Лимит запросов" },
                    { value: "offline", label: "Сбой сети" },
                    { value: "unavailable", label: "Сервис недоступен" },
                    { value: "conflict", label: "Конфликт профиля" },
                    { value: "session-expired", label: "Сессия истекла" },
                  ]}
                />
              </Field>
            </div>
          </div>
        </aside>
        <Routes>
          <Route index element={<Navigate to="login" replace />} />
          <Route
            path="login"
            element={
              <LoginPage
                onAuthenticated={() => {
                  void navigate("/dev/auth-profile/profile");
                }}
              />
            }
          />
          <Route element={<RequireAuth loginPath="/dev/auth-profile/login" />}>
            <Route path="profile" element={<ProfilePage loginPath="/dev/auth-profile/login" />} />
          </Route>
        </Routes>
      </AuthProfileProvider>
    </QueryClientProvider>
  );
}

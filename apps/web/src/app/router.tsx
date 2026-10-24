import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./layouts/RootLayout.tsx";
import { RequireAuth } from "./layouts/RequireAuth.tsx";

// Страницы грузятся лениво — первый экран (лендинг) не тянет код кабинета.
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      ...(import.meta.env.DEV
        ? [
            {
              path: "/dev/calculation-jobs",
              lazy: () =>
                import("@/features/watch-calculation").then((m) => ({ Component: m.CalculationPreview })),
            },
            {
              path: "/dev/forecast-insights",
              lazy: () =>
                import("@/widgets/forecast-insights").then((m) => ({ Component: m.ForecastInsightsPreview })),
            },
          ]
        : []),
      {
        path: "/",
        lazy: () => import("@/pages/landing").then((m) => ({ Component: m.LandingPage })),
      },
      {
        path: "/login",
        lazy: () => import("@/pages/login").then((m) => ({ Component: m.LoginPage })),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: "/app",
            lazy: () =>
              import("@/pages/dashboard").then((m) => ({
                Component: m.DashboardPage,
              })),
          },
          { path: "/app/*", element: <Navigate to="/app" replace /> },
        ],
      },
      {
        path: "*",
        lazy: () =>
          import("@/pages/not-found").then((m) => ({
            Component: m.NotFoundPage,
          })),
      },
    ],
  },
]);

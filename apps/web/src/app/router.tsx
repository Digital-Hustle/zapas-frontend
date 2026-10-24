import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "./layouts/RootLayout.tsx";
import { RequireAuth } from "./layouts/RequireAuth.tsx";

// Страницы грузятся лениво — первый экран (лендинг) не тянет код кабинета.
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      ...(import.meta.env.VITE_PREVIEW_MOCKS === "1"
        ? [
            {
              path: "/demo/forecast",
              lazy: () =>
                import("@/widgets/forecast-insights").then((m) => ({ Component: m.ForecastInsightsPreview })),
            },
            {
              path: "/demo/jobs",
              lazy: () =>
                import("@/features/watch-calculation").then((m) => ({ Component: m.CalculationPreview })),
            },
          ]
        : []),
      ...(import.meta.env.DEV
        ? [
            {
              path: "/dev/auth-profile/*",
              lazy: () =>
                import("./dev/AuthProfilePreview.tsx").then((m) => ({ Component: m.AuthProfilePreview })),
            },
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
            path: "/app/quality",
            lazy: () => import("@/pages/cashflow").then((m) => ({ Component: m.QualityPage })),
          },
          {
            path: "/app/overview",
            lazy: () => import("@/pages/cashflow").then((m) => ({ Component: m.OverviewPage })),
          },
          {
            path: "/app/plans",
            lazy: () => import("@/pages/cashflow").then((m) => ({ Component: m.PlansPage })),
          },
          {
            path: "/app/recurring",
            lazy: () => import("@/pages/cashflow").then((m) => ({ Component: m.RecurringPage })),
          },
          {
            path: "/app/company/:companyId",
            lazy: () => import("@/pages/dashboard").then((m) => ({ Component: m.CompanyPage })),
          },
          {
            path: "/app/payments",
            lazy: () => import("@/pages/payments").then((m) => ({ Component: m.PaymentsPage })),
          },
          {
            path: "/app/imports",
            lazy: () => import("@/pages/imports").then((m) => ({ Component: m.ImportsPage })),
          },
          {
            path: "/app/profile",
            lazy: () => import("@/pages/profile").then((m) => ({ Component: m.ProfilePage })),
          },
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

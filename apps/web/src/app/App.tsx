import { MotionConfig } from "motion/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { queryClient } from "@zapas/api";
import { ConfirmHost, Toaster } from "@zapas/ui";
import { tween } from "@zapas/tokens/motion";
import { router } from "./router.tsx";
import { ThemeProvider } from "./providers/ThemeProvider.tsx";

export function App() {
  return (
    <MotionConfig reducedMotion="user" transition={tween.base}>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster />
          <ConfirmHost />
        </QueryClientProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}

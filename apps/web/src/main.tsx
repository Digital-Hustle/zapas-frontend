import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App.tsx";
import "@/app/styles/index.css";

const root = document.getElementById("root");
async function start() {
  if (import.meta.env.VITE_PREVIEW_MOCKS === "1") {
    const { installPreviewApi } = await import("@/app/preview/api.ts");
    installPreviewApi();
  }
  if (!root) return;
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
void start();

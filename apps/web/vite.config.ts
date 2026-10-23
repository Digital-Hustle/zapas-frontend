import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwind()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    // dev — реальный gateway, --mode mock — prism-моки (pnpm contracts:mock)
    proxy: {
      "/api": {
        target:
          loadEnv(mode, process.cwd(), "VITE_").VITE_PROXY_TARGET ??
          "http://localhost:8080",
      },
    },
  },
  build: {
    target: "es2023",
    sourcemap: "hidden",
    rollupOptions: {
      output: {
        // rolldown-vite принимает manualChunks только функцией
        manualChunks: (id: string) => {
          if (
            id.includes("node_modules/motion") ||
            id.includes("node_modules/framer")
          )
            return "motion";
          if (id.includes("node_modules/@tanstack")) return "query";
          if (id.includes("node_modules/react")) return "react";
          return undefined;
        },
      },
    },
  },
}));

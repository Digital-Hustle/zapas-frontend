import { defineConfig } from "orval";

const services = {
  auth: { file: "auth.yaml", prefix: "/api/v1/auth", mutator: "http" },
  "auth-profile": { file: "auth-profile.yaml", prefix: "", mutator: "browserHttp" },
  orchestrator: { file: "orchestrator.openapi.yaml", prefix: "/api/v1/orchestrator", mutator: "browserHttp" },
  preprocessor: {
    file: "preprocessor-upload.openapi.yaml",
    prefix: "/api/v1/preprocessor",
    mutator: "browserHttp",
  },
} as const;

export default defineConfig(
  Object.fromEntries(
    Object.entries(services).map(([name, service]) => [
      name,
      {
        input: {
          target: `../../contracts/openapi/${service.file}`,
          override: ["orchestrator", "preprocessor"].includes(name)
            ? { transformer: "./orval-security-dependency.mjs" }
            : {},
          filters: { mode: "exclude", tags: ["internal"] },
        },
        output: {
          mode: "single",
          target: `./src/generated/${name}.ts`,
          client: "react-query",
          httpClient: "fetch",
          clean: false,
          prettier: true,
          headers: true,
          baseUrl: service.prefix,
          override: {
            mutator: {
              path: service.mutator === "http" ? "./src/http.ts" : "./src/browser.ts",
              name: service.mutator,
            },
            query: { useQuery: true, useSuspenseQuery: false, signal: true },
            fetch: { includeHttpResponseReturnType: false },
          },
        },
      },
    ]),
  ),
);

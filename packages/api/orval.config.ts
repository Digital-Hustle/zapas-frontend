import { defineConfig } from "orval";

const services = ["auth", "ledger", "planning", "forecast", "notify"] as const;

export default defineConfig(
  Object.fromEntries(
    services.map((svc) => [
      svc,
      {
        input: {
          target: `../../contracts/openapi/${svc}.yaml`,
          filters: { mode: "exclude", tags: ["internal"] },
        },
        output: {
          mode: "single",
          target: `./src/generated/${svc}.ts`,
          client: "react-query",
          httpClient: "fetch",
          clean: false,
          prettier: true,
          baseUrl: `/api/v1/${svc}`,
          override: {
            mutator: { path: "./src/http.ts", name: "http" },
            query: { useQuery: true, useSuspenseQuery: false, signal: true },
            fetch: { includeHttpResponseReturnType: false },
          },
        },
      },
    ]),
  ),
);

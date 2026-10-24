// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCalculation } from "./useCalculation.ts";
import type { Calculation, CalculationScope, ReadCalculation } from "./types.ts";

const scope: CalculationScope = { companyId: "company-a", accountId: "account-a", jobId: "job-a" };
let root: Root;
let host: HTMLDivElement;
let client: QueryClient;
const started = "2026-10-24T00:00:00Z";
const job = (status: string): Calculation => ({
  id: "job-a",
  status,
  createdAt: started,
  progress: null,
  resultId: status === "SUCCEEDED" ? "result-a" : null,
  error: null,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(started));
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
});
afterEach(() => {
  act(() => root.unmount());
  client.clear();
  host.remove();
  vi.useRealTimers();
});

async function tick(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
async function mount(read: ReadCalculation, selected = scope) {
  function Probe() {
    const q = useCalculation(selected, read);
    return (
      <output>
        {q.data?.status ?? "pending"}
        {q.isError ? ":error" : ""}
      </output>
    );
  }
  act(() => {
    root.render(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  await tick(1);
}

it("polls a job to success and stops at the terminal result", async () => {
  let reads = 0;
  await mount(() => Promise.resolve(job(["QUEUED", "RUNNING", "SUCCEEDED"][reads++] ?? "FAILED")));
  expect(host.textContent).toBe("QUEUED");
  await tick(1000);
  expect(host.textContent).toBe("RUNNING");
  await tick(1000);
  expect(host.textContent).toBe("SUCCEEDED");
  await tick(10000);
  expect(reads).toBe(3);
});

it("aborts an in-flight read when leaving the screen", async () => {
  let requestSignal: AbortSignal | undefined;
  await mount(async (_scope, signal) => {
    requestSignal = signal;
    return new Promise(() => undefined);
  });
  expect(requestSignal?.aborted).toBe(false);
  act(() => root.unmount());
  expect(requestSignal?.aborted).toBe(true);
});

it("does not reuse another account's cached result when the scope changes", async () => {
  await mount(() => Promise.resolve(job("SUCCEEDED")));
  expect(host.textContent).toBe("SUCCEEDED");
  await mount(async () => new Promise(() => undefined), { ...scope, accountId: "account-b" });
  expect(host.textContent).toBe("pending");
});

it("preserves cached progress and stops automatic polling after a read outage", async () => {
  let reads = 0;
  await mount(() =>
    reads++ === 0 ? Promise.resolve(job("QUEUED")) : Promise.reject(new Error("Сеть недоступна")),
  );
  await tick(1000);
  expect(host.textContent).toBe("QUEUED:error");
  await tick(10000);
  expect(reads).toBe(2);
});

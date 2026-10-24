import { expect, it } from "vitest";
import { pollingDelay } from "./polling.ts";

it("backs off long calculations from 1 to 2 to 5 seconds", () => {
  expect(pollingDelay("QUEUED", 0)).toBe(1000);
  expect(pollingDelay("RUNNING", 10000)).toBe(2000);
  expect(pollingDelay("RUNNING", 30000)).toBe(5000);
});

it("stops for terminal and unknown states", () => {
  for (const status of ["SUCCEEDED", "FAILED", "CANCELLED", "FUTURE_STATE"]) {
    expect(pollingDelay(status, 0)).toBe(false);
  }
});

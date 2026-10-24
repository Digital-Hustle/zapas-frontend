import { expect, it } from "vitest";
import { ApiError } from "@zapas/api";
import { mapBusinessFailure } from "./problem.ts";

it("keeps an uncertain command unresolved after network/server failure but recognizes a known rejection", () => {
  expect(mapBusinessFailure(new ApiError({ status: 0, code: "NETWORK", detail: "private" })).ambiguous).toBe(
    true,
  );
  expect(
    mapBusinessFailure(new ApiError({ status: 503, code: "DEPENDENCY_UNAVAILABLE", detail: "private" }))
      .ambiguous,
  ).toBe(true);
  expect(
    mapBusinessFailure(new ApiError({ status: 403, code: "FORBIDDEN", detail: "private" })).ambiguous,
  ).toBe(false);
  expect(
    mapBusinessFailure(
      new ApiError({ status: 503, code: "DEPENDENCY_UNAVAILABLE", detail: "private" }, false),
    ).kind,
  ).toBe("refresh-uncertain");
});
it("never displays server details or unknown fields in business forms", () => {
  const issue = mapBusinessFailure(
    new ApiError({
      status: 422,
      code: "VALIDATION_FAILED",
      detail: "private",
      errors: [
        { field: "accountNumber", code: "invalid", message: "private" },
        { field: "token", code: "invalid", message: "private" },
      ],
    }),
  );
  expect(issue.fields).toEqual({ accountNumber: "Номер счёта: 20 цифр" });
  expect(JSON.stringify(issue)).not.toContain("private");
});

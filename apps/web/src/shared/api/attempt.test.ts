import { expect, it } from "vitest";
import { CommandAttempt } from "./attempt.ts";

it("replays the original command after a lost response, even if the draft object changed", () => {
  let count = 0;
  const command = new CommandAttempt<{ name: string }>(() => `key-${++count}`);
  const draft = { name: "Первая компания" };
  const first = command.begin(draft);
  draft.name = "Другой черновик";
  expect(command.begin(draft)).toEqual({ key: first.key, value: { name: "Первая компания" } });
  expect(count).toBe(1);
  command.finish();
  expect(command.begin(draft)).toEqual({ key: "key-2", value: { name: "Другой черновик" } });
});

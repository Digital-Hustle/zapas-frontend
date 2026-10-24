// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { MoneyInput } from "../src/index.ts";
afterEach(cleanup);
const spaces = (value: string) => value.replace(/[\u00a0\u202f]/g, " ");

it("preserves all 17 integer digits and kopecks when editing and blurring through a form callback", async () => {
  const blur = vi.fn();
  function Example() {
    const [value, setValue] = useState<string | null>("99999999999999999.99");
    return <MoneyInput aria-label="Сумма" value={value} onChange={setValue} onBlur={blur} />;
  }
  render(<Example />);
  const input = screen.getByRole<HTMLInputElement>("textbox");
  const user = userEvent.setup();
  expect(spaces(input.value)).toBe("99 999 999 999 999 999,99");
  await user.clear(input);
  await user.type(input, "9007199254740993,01");
  await user.tab();
  expect(spaces(input.value)).toBe("9 007 199 254 740 993,01");
  expect(blur).toHaveBeenCalledOnce();
});

it("retains invalid input for correction instead of silently changing its sign or clearing it", async () => {
  const changed = vi.fn();
  render(<MoneyInput aria-label="Сумма" value={null} onChange={changed} />);
  const user = userEvent.setup();
  const input = screen.getByRole("textbox");
  await user.type(input, "-100");
  await user.tab();
  expect(input).toHaveValue("-100");
  expect(input).toBeInvalid();
  expect(changed).toHaveBeenLastCalledWith(null);
});

it("accepts a signed balance only when requested by the caller", async () => {
  const changed = vi.fn();
  render(<MoneyInput aria-label="Остаток" allowNegative value={null} onChange={changed} />);
  await userEvent.setup().type(screen.getByRole("textbox"), "-100,50");
  expect(changed).toHaveBeenLastCalledWith("-100.50");
});

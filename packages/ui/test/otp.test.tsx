// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createRef, useState } from "react";
import { cleanup, render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { Button, OtpInput, ResendCode } from "../src/index.ts";

beforeAll(() => {
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: vi.fn(() => null) });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("keeps a loading link unavailable even when disabled is explicitly false", async () => {
  const clicked = vi.fn();
  render(
    <Button asChild loading disabled={false}>
      <a href="/account" onClick={clicked}>
        Продолжить
      </a>
    </Button>,
  );
  const link = screen.getByRole("link", { name: "Продолжить" });
  expect(link).toHaveAttribute("aria-disabled", "true");
  expect(link).toHaveAttribute("tabindex", "-1");
  await userEvent.setup().click(link);
  expect(clicked).not.toHaveBeenCalled();
});

it("accepts a pasted six-digit code once and exposes field error/ref/blur to a form", async () => {
  const complete = vi.fn(),
    blur = vi.fn();
  const ref = createRef<HTMLInputElement>();
  function Example() {
    const [value, change] = useState("");
    return (
      <>
        <label htmlFor="otp">Код подтверждения</label>
        <OtpInput
          id="otp"
          ref={ref}
          value={value}
          onChange={change}
          onComplete={complete}
          onBlur={blur}
          invalid
          aria-describedby="otp-error"
        />
        <p id="otp-error">Проверьте код</p>
      </>
    );
  }
  render(<Example />);
  const user = userEvent.setup();
  const input = screen.getByRole("textbox", { name: "Код подтверждения" });
  expect(input).toBeInvalid();
  expect(input).toHaveAccessibleDescription("Проверьте код");
  expect(ref.current).toBe(input);
  await user.click(input);
  await user.paste("123456");
  await user.tab();
  expect(complete).toHaveBeenCalledExactlyOnceWith("123456");
  expect(blur).toHaveBeenCalled();
});

it("does not complete a disabled OTP input", () => {
  const complete = vi.fn();
  render(<OtpInput value="123456" onChange={vi.fn()} onComplete={complete} disabled />);
  expect(screen.getByRole("textbox")).toBeDisabled();
  expect(complete).not.toHaveBeenCalled();
});

it("uses the absolute resend deadline, handles deadline changes and disables unknown time", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-24T00:00:00Z"));
  const resend = vi.fn();
  const { rerender } = render(<ResendCode resendAt={Date.now() + 3000} onResend={resend} />);
  expect(screen.getByRole("button")).toBeDisabled();
  expect(screen.getByRole("button")).toHaveTextContent("3 с");
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(screen.getByRole("button")).toBeEnabled();
  rerender(<ResendCode resendAt={Date.now() + 60000} onResend={resend} />);
  expect(screen.getByRole("button")).toBeDisabled();
  rerender(<ResendCode resendAt={null} onResend={resend} />);
  expect(screen.getByRole("button")).toBeDisabled();
  expect(resend).not.toHaveBeenCalled();
});

it("blocks duplicate resend and keeps a failed operation visible without automatic retry", async () => {
  let fail: (error: Error) => void = () => undefined;
  const resend = vi.fn(
    () =>
      new Promise<void>((_resolve, reject) => {
        fail = reject;
      }),
  );
  render(<ResendCode resendAt={Date.now() - 1} onResend={resend} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button"));
  await user.click(screen.getByRole("button"));
  expect(resend).toHaveBeenCalledOnce();
  expect(screen.getByRole("button")).toBeDisabled();
  await act(async () => {
    fail(new Error("Network"));
    await Promise.resolve();
  });
  expect(screen.getByRole("alert")).toHaveTextContent("Не удалось повторно запросить код");
  expect(resend).toHaveBeenCalledOnce();
});

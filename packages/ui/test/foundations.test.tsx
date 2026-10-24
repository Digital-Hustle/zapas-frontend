// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Amount, FileDrop, Progress, Stepper, RiskBadge, ErrorState } from "../src/index.ts";

afterEach(cleanup);
function Upload({ busy = false }: { busy?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  return <FileDrop label="Выписка CSV" value={file} onValueChange={setFile} maxSize={20} busy={busy} />;
}
const choose = (file: File) =>
  fireEvent.change(screen.getByLabelText("Выписка CSV", { selector: "input" }), {
    target: { files: [file] },
  });

it("keeps the visible file label in its accessible name and exposes instructions as description", () => {
  render(<Upload />);
  const button = screen.getByRole("button", { name: "Выписка CSV" });
  expect(button).toHaveTextContent("Выписка CSV");
  expect(button).not.toHaveTextContent("Перетащите файл");
  expect(button).toHaveAccessibleDescription(/Перетащите файл или нажмите Enter/u);
});

it("previews only an accepted file and allows clearing and choosing it again", async () => {
  render(<Upload />);
  const file = new File(["date,amount"], "bank.csv", { type: "text/csv" });
  choose(file);
  await screen.findByText("bank.csv");
  await userEvent.setup().click(screen.getByRole("button", { name: "Убрать файл" }));
  expect(screen.queryByText("bank.csv")).not.toBeInTheDocument();
  choose(file);
  await screen.findByText("bank.csv");
});

it("rejects type, size, empty and multiple files before changing the selected value", async () => {
  const change = vi.fn();
  render(<FileDrop label="Выписка CSV" value={null} onValueChange={change} maxSize={20} />);
  for (const [file, message] of [
    [new File(["abc"], "bank.exe", { type: "application/octet-stream" }), "Неподдерживаемый тип файла."],
    [new File(["x".repeat(21)], "bank.csv", { type: "text/csv" }), "Файл превышает допустимый размер."],
    [new File([], "bank.csv", { type: "text/csv" }), "Файл пуст."],
  ] as const) {
    choose(file);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message));
  }
  fireEvent.change(screen.getByLabelText("Выписка CSV", { selector: "input" }), {
    target: {
      files: [new File(["1"], "a.csv", { type: "text/csv" }), new File(["2"], "b.csv", { type: "text/csv" })],
    },
  });
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Выберите один файл."));
  expect(change).not.toHaveBeenCalled();
});

it("keeps a prior accepted file after a rejection and locks removal while uploading", async () => {
  const change = vi.fn();
  const file = new File(["1"], "kept.csv", { type: "text/csv" });
  const { rerender } = render(
    <FileDrop label="Выписка CSV" value={file} onValueChange={change} maxSize={20} />,
  );
  choose(new File(["bad"], "bad.exe", { type: "application/octet-stream" }));
  await screen.findByRole("alert");
  expect(screen.getByText("kept.csv")).toBeVisible();
  rerender(<FileDrop label="Выписка CSV" value={file} onValueChange={change} maxSize={20} busy />);
  expect(screen.getByRole("button", { name: "Убрать файл" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Выписка CSV" })).toHaveAttribute("aria-disabled", "true");
});

it("does not replace unknown progress or risk with a successful zero", () => {
  render(
    <>
      <Progress value={null} label="Импорт" />
      <RiskBadge level="unknown" />
      <Stepper
        currentId="review"
        steps={[
          { id: "upload", label: "Файл" },
          { id: "review", label: "Проверка" },
        ]}
      />
    </>,
  );
  expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  expect(screen.getByText("Риск не оценён")).toBeVisible();
  expect(screen.getByText("Проверка").closest("li")).toHaveAttribute("aria-current", "step");
});

it("retains exact money text beyond the safe animation range and persistent error context", () => {
  render(
    <>
      <Amount value="99999999999999999.99" />
      <ErrorState description="Сбой обновления" traceId="trace-1" onRetry={vi.fn()} offline />
    </>,
  );
  expect(screen.getByText("99 999 999 999 999 999,99 ₽", { exact: false })).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent("trace-1");
  expect(screen.getByRole("button", { name: "Повторить" })).toBeDisabled();
});

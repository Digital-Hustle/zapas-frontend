// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { DatePicker, Field, Select } from "../src/index.ts";

afterEach(cleanup);
// jsdom не реализует прокрутку, которую Radix вызывает при смене фокуса.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterAll(() => {
  Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

describe("Select", () => {
  it("выбирает доступную опцию клавиатурой и возвращает фокус", async () => {
    const user = userEvent.setup();
    function Form() {
      const [value, setValue] = useState("");
      return (
        <Field label="Категория" htmlFor="category">
          <Select
            id="category"
            value={value}
            onValueChange={setValue}
            options={[
              { value: "rent", label: "Аренда", disabled: true },
              { value: "tax", label: "Налоги" },
            ]}
          />
        </Field>
      );
    }
    render(<Form />);
    await user.tab();
    await user.keyboard("{Enter}{ArrowDown}{Enter}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(screen.getByRole("combobox", { name: "Категория" })).toHaveTextContent("Налоги");
    expect(screen.getByRole("combobox")).toHaveFocus();
  });

  it("отличает загрузку и отсутствие вариантов от выбранного значения", () => {
    const { rerender } = render(
      <Select aria-label="Категория" options={[]} loading onValueChange={vi.fn()} />,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("combobox")).toHaveTextContent("Загрузка");
    rerender(<Select aria-label="Категория" options={[]} onValueChange={vi.fn()} />);
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("combobox")).toHaveTextContent("Нет вариантов");
  });

  it("связывает ошибку поля с контролом", () => {
    render(
      <Field htmlFor="category" label="Категория" error="Выберите категорию">
        <Select
          id="category"
          invalid
          aria-describedby="category-error"
          options={[{ value: "tax", label: "Налоги" }]}
          onValueChange={vi.fn()}
        />
      </Field>,
    );
    expect(screen.getByRole("combobox")).toHaveAccessibleDescription("Выберите категорию");
    expect(screen.getByRole("combobox")).toBeInvalid();
  });
});

describe("DatePicker", () => {
  it("помечает невозможную дату как ошибку вместо её нормализации", () => {
    render(<DatePicker aria-label="Дата" value="2026-02-29" onValueChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Дата" })).toBeInvalid();
  });

  it("сохраняет обязательную дату и не предлагает очистку", async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Дата" required value="2026-12-31" onValueChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Дата" }));
    expect(screen.queryByRole("button", { name: "Очистить дату" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Дата" })).toHaveTextContent("31 декабря 2026");
  });

  it("отключает даты, запрещённые формой", async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        aria-label="Дата"
        value="2028-02-29"
        disabledDates={{ before: new Date(2028, 1, 29) }}
        onValueChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Дата" }));
    expect(screen.getByRole("button", { name: /28 февраля/ })).toBeDisabled();
  });

  it("выбирает високосную дату без преобразования в UTC и закрывает календарь", async () => {
    const user = userEvent.setup();
    function Form() {
      const [value, setValue] = useState<string | undefined>("2028-02-28");
      return (
        <>
          <DatePicker aria-label="Дата платежа" value={value} onValueChange={setValue} />
          <output aria-label="Значение">{value}</output>
        </>
      );
    }
    render(<Form />);
    await user.click(screen.getByRole("button", { name: "Дата платежа" }));
    await user.keyboard("{ArrowRight}{Enter}");
    expect(screen.getByLabelText("Значение")).toHaveTextContent("2028-02-29");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Дата платежа" })).toHaveFocus();
  });

  it("позволяет очистить необязательную дату", async () => {
    const user = userEvent.setup();
    function Form() {
      const [value, setValue] = useState<string | undefined>("2026-12-31");
      return <DatePicker aria-label="Дата" value={value} onValueChange={setValue} />;
    }
    render(<Form />);
    await user.click(screen.getByRole("button", { name: "Дата" }));
    await user.click(screen.getByRole("button", { name: "Очистить дату" }));
    expect(screen.getByRole("button", { name: "Дата" })).toHaveTextContent("Выберите дату");
  });

  it("не открывает отключённый календарь", async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Дата" disabled value="2026-12-31" onValueChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Дата" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

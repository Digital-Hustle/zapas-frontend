// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { cleanup, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Checkbox, Switch, RadioGroup, Segmented } from "../src/index.ts";

afterEach(cleanup);
// jsdom не измеряет элементы; размеры интерактивных областей проверяются в Chromium.
beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});
afterAll(() => {
  vi.unstubAllGlobals();
});
const options = [
  { value: "30", label: "30 дней" },
  { value: "60", label: "60 дней", disabled: true },
  { value: "90", label: "90 дней" },
];

describe("контролы выбора", () => {
  it("переходит из mixed в checked по Space и передаёт checkbox в форму", async () => {
    function Form() {
      const [checked, setChecked] = useState<boolean | "indeterminate">("indeterminate");
      return (
        <form aria-label="Настройки">
          <Checkbox
            aria-label="Все уведомления"
            checked={checked}
            onCheckedChange={setChecked}
            name="notifications"
            value="all"
          />
        </form>
      );
    }
    render(<Form />);
    expect(screen.getByRole("checkbox")).toBePartiallyChecked();
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard(" ");
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(new FormData(screen.getByRole<HTMLFormElement>("form")).get("notifications")).toBe("all");
  });

  it("переключает switch по Space и сохраняет значение при disabled", async () => {
    function Form({ disabled = false }: { disabled?: boolean }) {
      const [checked, setChecked] = useState(false);
      return (
        <Switch aria-label="Письма" checked={checked} onCheckedChange={setChecked} disabled={disabled} />
      );
    }
    const { rerender } = render(<Form />);
    const user = userEvent.setup();
    await user.tab();
    await user.keyboard(" ");
    expect(screen.getByRole("switch")).toBeChecked();
    rerender(<Form disabled />);
    await user.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toBeChecked();
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it.each([RadioGroup, Segmented])(
    "выбирает доступный вариант стрелками и сериализует одно значение",
    async (Control) => {
      function Form() {
        const [value, setValue] = useState("30");
        return (
          <form aria-label="Настройки">
            <Control
              label="Горизонт"
              value={value}
              onValueChange={setValue}
              options={options}
              name="horizon"
              orientation="horizontal"
            />
          </form>
        );
      }
      render(<Form />);
      const user = userEvent.setup();
      await user.tab();
      await user.keyboard("{ArrowRight>}");
      await waitFor(() => expect(screen.getByRole("radio", { name: "90 дней" })).toBeChecked());
      await user.keyboard("{/ArrowRight}");
      expect(screen.getByRole("radio", { name: "90 дней" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "60 дней" })).toBeDisabled();
      expect(new FormData(screen.getByRole<HTMLFormElement>("form")).getAll("horizon")).toEqual(["90"]);
    },
  );

  it("изолирует два экземпляра Segmented с одинаковыми вариантами", async () => {
    function Form() {
      const [value, setValue] = useState("30");
      const [other, setOther] = useState("30");
      return (
        <>
          <Segmented label="Первый" value={value} onValueChange={setValue} options={options} />
          <Segmented label="Второй" value={other} onValueChange={setOther} options={options} />
        </>
      );
    }
    render(<Form />);
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Первый" })).getByRole("radio", { name: "90 дней" }),
    );
    expect(screen.getAllByRole("radio", { name: "30 дней" })[1]).toBeChecked();
    expect(screen.getAllByRole("radio", { name: "90 дней" })[0]).toBeChecked();
  });

  it("не отправляет форму при переключении контролов", async () => {
    function Form() {
      const [checked, setChecked] = useState(false);
      const [value, setValue] = useState("30");
      const [submitted, setSubmitted] = useState(false);
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <Checkbox
            checked={checked}
            onCheckedChange={(next) => setChecked(next === true)}
            aria-label="Выбор"
          />
          <Switch checked={checked} onCheckedChange={setChecked} aria-label="Письма" />
          <Segmented label="Горизонт" value={value} onValueChange={setValue} options={options} />
          <button type="submit">Сохранить</button>
          <output>{submitted ? "Отправлено" : "Черновик"}</output>
        </form>
      );
    }
    render(<Form />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("switch"));
    await user.click(screen.getByRole("radio", { name: "90 дней" }));
    expect(screen.getByRole("status")).toHaveTextContent("Черновик");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(screen.getByRole("status")).toHaveTextContent("Отправлено");
  });
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { createRef, useState } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { Slider, RangeSlider, Tabs } from "../src/index.ts";

afterEach(cleanup);
beforeAll(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  ),
);
afterAll(() => vi.unstubAllGlobals());

it("меняет шаг стрелкой, ограничивает Home/End и передаёт значение формы", async () => {
  const ref = createRef<HTMLSpanElement>();
  function Form() {
    const [value, setValue] = useState(20);
    return (
      <form aria-label="Параметры">
        <Slider
          ref={ref}
          label="Процент"
          value={value}
          onValueChange={setValue}
          name="percent"
          min={10}
          max={50}
          step={5}
          formatValue={(v) => `${v}%`}
        />
      </form>
    );
  }
  render(<Form />);
  const user = userEvent.setup();
  ref.current?.focus();
  expect(screen.getByRole("slider")).toHaveFocus();
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "25");
  expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "25%");
  await user.keyboard("{End}{ArrowRight}");
  expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "50");
  await user.keyboard("{Home}{ArrowLeft}");
  expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "10");
  expect(new FormData(screen.getByRole<HTMLFormElement>("form")).get("percent")).toBe("10");
});

it("различает границы диапазона, не пересекает их и сериализует оба значения", async () => {
  function Form() {
    const [value, setValue] = useState<[number, number]>([20, 40]);
    return (
      <form aria-label="Параметры">
        <RangeSlider
          label="Диапазон"
          thumbLabels={["От", "До"]}
          value={value}
          onValueChange={setValue}
          name="range"
          min={0}
          max={100}
          step={10}
          minStepsBetweenThumbs={1}
        />
      </form>
    );
  }
  render(<Form />);
  const user = userEvent.setup();
  await user.tab();
  await user.keyboard("{ArrowRight}{ArrowRight}");
  expect(screen.getByRole("slider", { name: "От" })).toHaveAttribute("aria-valuenow", "30");
  await user.tab();
  expect(screen.getByRole("slider", { name: "До" })).toHaveFocus();
  expect(screen.getByRole("slider", { name: "До" })).toHaveAttribute("aria-valuenow", "40");
  await user.keyboard("{ArrowLeft}");
  expect(screen.getByRole("slider", { name: "До" })).toHaveAttribute("aria-valuenow", "40");
  await user.keyboard("{ArrowRight}");
  expect(screen.getByRole("slider", { name: "До" })).toHaveAttribute("aria-valuenow", "50");
  expect(new FormData(screen.getByRole<HTMLFormElement>("form")).getAll("range[]")).toEqual(["30", "50"]);
});

it("disabled не меняет значение и не попадает в порядок Tab", async () => {
  const onValueChange = vi.fn();
  render(
    <>
      <Slider label="Отключён" value={20} onValueChange={onValueChange} disabled />
      <button>Дальше</button>
    </>,
  );
  const user = userEvent.setup();
  await user.tab();
  expect(screen.getByRole("button")).toHaveFocus();
  await user.keyboard("{ArrowRight}");
  expect(onValueChange).not.toHaveBeenCalled();
});

it("вкладки пропускают disabled, открывают связанную панель и поддерживают Home", async () => {
  function Example() {
    const [value, setValue] = useState("one");
    return (
      <Tabs
        label="Разделы"
        value={value}
        onValueChange={setValue}
        items={[
          { value: "one", label: "Один", content: <p>Первая панель</p> },
          { value: "two", label: "Два", content: <p>Недоступно</p>, disabled: true },
          { value: "three", label: "Три", content: <p>Третья панель</p> },
        ]}
      />
    );
  }
  render(<Example />);
  const user = userEvent.setup();
  await user.tab();
  await user.keyboard("{ArrowRight>}");
  await waitFor(() =>
    expect(screen.getByRole("tab", { name: "Три" })).toHaveAttribute("aria-selected", "true"),
  );
  await user.keyboard("{/ArrowRight}");
  expect(screen.getByRole("tabpanel", { name: "Три" })).toHaveTextContent("Третья панель");
  expect(screen.queryByText("Первая панель")).not.toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Два" })).toBeDisabled();
  await user.keyboard("{Home>}");
  await waitFor(() => expect(screen.getByRole("tab", { name: "Один" })).toHaveFocus());
  await user.keyboard("{/Home}");
  expect(screen.getByRole("tabpanel", { name: "Один" })).toBeVisible();
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AlertDialog,
  Button,
  Combobox,
  DateRangePicker,
  MultiSelect,
  Table,
  type ColumnDef,
  type RowSelectionState,
} from "../src/index.ts";

beforeAll(() => {
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
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());
const options = [
  { value: "a", label: "Аренда" },
  { value: "b", label: "Банк", disabled: true },
  { value: "c", label: "Связь" },
];

it("searches options and never submits a disabled option", async () => {
  const selected = vi.fn();
  render(<Combobox aria-label="Категория" options={options} onValueChange={selected} />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Категория" }));
  await user.type(screen.getByRole("combobox"), "Банк");
  await user.keyboard("{Enter}");
  expect(selected).not.toHaveBeenCalled();
  await user.clear(screen.getByRole("combobox"));
  await user.type(screen.getByRole("combobox"), "Связь");
  await user.keyboard("{Enter}");
  expect(selected).toHaveBeenCalledWith("c");
});

it("exposes remote search failures and does not select a stale option while loading", async () => {
  const selected = vi.fn(),
    search = vi.fn();
  const { rerender } = render(
    <Combobox
      aria-label="Категория"
      options={options}
      onValueChange={selected}
      onSearchChange={search}
      remote
      loading
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Категория" }));
  await user.type(screen.getByRole("combobox"), "новая");
  await user.keyboard("{Enter}");
  expect(selected).not.toHaveBeenCalled();
  expect(search).toHaveBeenLastCalledWith("новая");
  rerender(
    <Combobox
      aria-label="Категория"
      options={options}
      onValueChange={selected}
      remote
      error="Справочник недоступен"
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Справочник недоступен");
  await user.keyboard("{Enter}");
  expect(selected).not.toHaveBeenCalled();
});

it("toggles multiple values without closing the list", async () => {
  function Example() {
    const [value, setValue] = useState<string[]>([]);
    return (
      <MultiSelect
        aria-label="Категории"
        name="category"
        value={value}
        onValueChange={setValue}
        options={options}
      />
    );
  }
  render(<Example />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Категории" }));
  await user.click(screen.getByRole("option", { name: /Аренда/ }));
  expect(screen.getByRole("option", { name: /Аренда/ })).toHaveAttribute("aria-checked", "true");
  await user.click(screen.getByRole("option", { name: /Аренда/ }));
  expect(screen.getByRole("option", { name: /Аренда/ })).toHaveAttribute("aria-checked", "false");
});

it("uses a business-local date for the 30-day preset and leaves the value intact on cancel", async () => {
  const change = vi.fn();
  render(
    <DateRangePicker
      aria-label="Период"
      today="2028-03-01"
      value={{ from: "2028-01-01", to: "2028-01-31" }}
      onValueChange={change}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Период" }));
  await user.keyboard("{Escape}");
  expect(change).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Период" }));
  await user.click(screen.getByRole("button", { name: "30 дней" }));
  expect(change).toHaveBeenCalledWith({ from: "2028-02-01", to: "2028-03-01" });
});

interface Entry {
  id: string;
  name: string;
}
const columns: ColumnDef<Entry>[] = [{ accessorKey: "name", header: "Название", enableSorting: true }];
it("keeps selection attached to a resource ID after sorting, including mixed select-all", async () => {
  function Example() {
    const [selected, setSelected] = useState<RowSelectionState>({});
    return (
      <Table
        label="Данные"
        data={[
          { id: "b", name: "Банк" },
          { id: "a", name: "Аренда" },
        ]}
        columns={columns}
        getRowId={(row) => row.id}
        selection={selected}
        onSelectionChange={setSelected}
      />
    );
  }
  render(<Example />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("checkbox", { name: "Выбрать строку 1" }));
  await user.click(screen.getByRole("button", { name: "Название" }));
  const bank = screen.getByRole("cell", { name: "Банк" }).closest("tr");
  if (!bank) throw new Error("Missing bank row");
  expect(within(bank).getByRole("checkbox")).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Выбрать все загруженные строки" })).toBePartiallyChecked();
});

it("manual sorting requests a server ordering without pretending the loaded page is the whole dataset", async () => {
  const sort = vi.fn();
  render(
    <Table
      label="Данные"
      manualSorting
      sorting={[]}
      onSortingChange={sort}
      data={[
        { id: "b", name: "Банк" },
        { id: "a", name: "Аренда" },
      ]}
      columns={columns}
      getRowId={(row) => row.id}
    />,
  );
  await userEvent.setup().click(screen.getByRole("button", { name: "Название" }));
  expect(sort).toHaveBeenCalledOnce();
  expect(screen.getAllByRole("cell")[0]).toHaveTextContent("Банк");
});

it("shows stale rows with a persistent refresh error rather than replacing them", () => {
  render(
    <Table
      label="Данные"
      error="Сбой сервера"
      data={[{ id: "b", name: "Банк" }]}
      columns={columns}
      getRowId={(row) => row.id}
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Сбой сервера");
  expect(screen.getByRole("cell", { name: "Банк" })).toBeVisible();
});

it("locks confirmation while pending and keeps a failed action open for explicit recovery", async () => {
  let reject: (reason: Error) => void = () => undefined;
  const confirm = vi.fn(
    () =>
      new Promise<void>((_resolve, fail) => {
        reject = fail;
      }),
  );
  function Example() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Удаление</Button>
        <AlertDialog
          title="Удалить?"
          open={open}
          onOpenChange={setOpen}
          confirmLabel="Удалить"
          onConfirm={confirm}
        />
      </>
    );
  }
  render(<Example />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Удаление" }));
  await user.click(screen.getByRole("button", { name: "Удалить" }));
  expect(screen.getByRole("button", { name: "Отмена" })).toBeDisabled();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("alertdialog")).toBeVisible();
  reject(new Error("Offline"));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Действие не завершено"));
  expect(confirm).toHaveBeenCalledOnce();
});

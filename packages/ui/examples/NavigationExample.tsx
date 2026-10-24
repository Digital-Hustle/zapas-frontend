import { useState } from "react";
import {
  AlertDialog,
  Button,
  Combobox,
  CommandPalette,
  ContextMenu,
  DateRangePicker,
  DropdownMenu,
  Field,
  MultiSelect,
  Popover,
  Sheet,
  Table,
  Tooltip,
  TooltipProvider,
  VirtualTable,
  type CalendarRange,
  type ColumnDef,
  type RowSelectionState,
} from "../src/index.ts";

const options = Array.from({ length: 250 }, (_, i) => ({
  value: String(i + 1),
  label: `Категория ${String(i + 1).padStart(3, "0")}`,
  disabled: i === 4,
}));
const entries = Array.from({ length: 500 }, (_, i) => ({
  id: String(i),
  name: `Операция ${String(i + 1).padStart(3, "0")}`,
  category: `Категория ${i % 3}`,
}));
const columns: ColumnDef<(typeof entries)[number]>[] = [
  { accessorKey: "name", header: "Название", enableSorting: true },
  { accessorKey: "category", header: "Категория" },
];
export function NavigationExample() {
  const [category, setCategory] = useState("");
  const [multi, setMulti] = useState<string[]>([]);
  const [range, setRange] = useState<CalendarRange | undefined>();
  const [selection, setSelection] = useState<RowSelectionState>({});
  const [confirm, setConfirm] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [action, setAction] = useState("Не выбрано");
  const items = [
    { id: "copy", label: "Скопировать", onSelect: () => setAction("Скопировано") },
    { id: "disabled", label: "Недоступное действие", disabled: true, onSelect: () => setAction("Ошибка") },
  ];
  return (
    <TooltipProvider>
      <section
        aria-label="Поиск и навигация"
        className="border-border bg-card flex min-w-0 flex-col gap-6 rounded-xl border p-4 md:p-6"
      >
        <h2 className="text-lg font-semibold">Поиск и навигация</h2>
        <Field label="Поиск категории" htmlFor="search-category">
          <Combobox id="search-category" value={category} onValueChange={setCategory} options={options} />
        </Field>
        <Field label="Несколько категорий" htmlFor="multi-category">
          <MultiSelect
            id="multi-category"
            value={multi}
            onValueChange={setMulti}
            options={options.slice(0, 8)}
          />
        </Field>
        <p className="text-sm" data-testid="multi-result">
          Выбраны категории: {multi.join(", ") || "нет"}
        </p>
        <Field label="Период операций" htmlFor="date-range">
          <DateRangePicker id="date-range" value={range} onValueChange={setRange} today="2026-10-24" />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Tooltip content="Подсказка о данных">
            <Button variant="secondary">Подсказка</Button>
          </Tooltip>
          <Popover label="Параметры" trigger={<Button variant="secondary">Параметры</Button>}>
            <p className="text-sm">Дополнительные параметры таблицы</p>
          </Popover>
          <DropdownMenu
            label="Действия"
            trigger={<Button variant="secondary">Действия</Button>}
            items={items}
          />
          <ContextMenu label="Контекстные действия" items={items}>
            <Button variant="secondary">Контекстное меню</Button>
          </ContextMenu>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Открыть шторку
          </Button>
          <Button variant="danger-soft" onClick={() => setConfirm(true)}>
            Подтверждение
          </Button>
        </div>
        <p role="status" aria-label="Результат действия">
          {action}
        </p>
        <Sheet title="Настройки таблицы" description="Пример шторки" open={sheet} onOpenChange={setSheet}>
          <p>Настройки доступны с клавиатуры.</p>
        </Sheet>
        <AlertDialog
          title="Подтвердить действие?"
          description="Пример без обращения к API"
          open={confirm}
          onOpenChange={setConfirm}
          confirmLabel="Подтвердить"
          onConfirm={() => {
            setAction("Подтверждено");
          }}
        >
          Сохранённые данные останутся доступными.
        </AlertDialog>
        <p className="text-muted-foreground text-sm">Палитра действий: Ctrl/Cmd + K</p>
        <CommandPalette
          actions={[
            { id: "table", label: "Перейти к таблице", onSelect: () => setAction("Таблица выбрана") },
          ]}
        />
        <Table
          label="Обычная таблица"
          data={entries.slice(0, 3)}
          columns={columns}
          getRowId={(row) => row.id}
          selection={selection}
          onSelectionChange={setSelection}
        />
        <p className="text-muted-foreground text-sm" data-testid="selection-result">
          Выбрано строк: {Object.values(selection).filter(Boolean).length}
        </p>
        <VirtualTable
          label="Виртуальная таблица"
          data={entries}
          columns={columns}
          getRowId={(row) => row.id}
        />
      </section>
    </TooltipProvider>
  );
}

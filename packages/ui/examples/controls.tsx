import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "motion/react";
import { Button, DatePicker, Field, Select } from "../src/index.ts";
import "./styles.css";
import { SelectionExample } from "./SelectionExample.tsx";
import { ScenarioExample } from "./ScenarioExample.tsx";
import { FoundationExample } from "./FoundationExample.tsx";
import { NavigationExample } from "./NavigationExample.tsx";

const options = [
  { value: "rent", label: "Аренда" },
  { value: "salary", label: "Зарплата" },
  { value: "tax", label: "Налоги" },
  { value: "archive", label: "Архивная категория", disabled: true },
];

function Controls() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  const [category, setCategory] = useState("");
  const [date, setDate] = useState<string | undefined>("2028-02-28");
  return (
    <MotionConfig reducedMotion="user">
      <div className={dark ? "dark" : undefined}>
        <main className="bg-background text-foreground min-h-screen p-4 md:p-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-8">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-primary text-sm font-medium">Запас / UI-кит</p>
                <h1 className="mt-2 text-2xl font-semibold">Компоненты форм</h1>
              </div>
              <Button variant="secondary" onClick={() => setDark(!dark)}>
                {dark ? "Светлая тема" : "Тёмная тема"}
              </Button>
            </header>
            <section
              aria-label="Пример формы"
              className="border-border bg-card flex flex-col gap-6 rounded-xl border p-4 md:p-6"
            >
              <h2 className="text-lg font-semibold">Параметры платежа</h2>
              <Field label="Категория" htmlFor="category">
                <Select id="category" value={category} onValueChange={setCategory} options={options} />
              </Field>
              <Field label="Дата платежа" htmlFor="date">
                <DatePicker id="date" value={date} onValueChange={setDate} />
              </Field>
              <p role="status" className="text-muted-foreground text-sm">
                Значение даты: {date ?? "не выбрано"}
              </p>
            </section>
            <SelectionExample />
            <ScenarioExample />
            <FoundationExample />
            <NavigationExample />
            <section
              aria-label="Состояния"
              className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 md:p-6"
            >
              <h2 className="text-lg font-semibold">Состояния</h2>
              <Field label="Загрузка категорий" htmlFor="loading">
                <Select id="loading" loading options={[]} onValueChange={setCategory} />
              </Field>
              <Field label="Пустой справочник" htmlFor="empty">
                <Select id="empty" options={[]} onValueChange={setCategory} />
              </Field>
              <Field label="Обязательная категория" htmlFor="invalid" error="Выберите категорию">
                <Select
                  id="invalid"
                  invalid
                  aria-describedby="invalid-error"
                  options={options}
                  onValueChange={setCategory}
                />
              </Field>
              <Field label="Недоступная дата" htmlFor="disabled">
                <DatePicker id="disabled" disabled value="2026-12-31" onValueChange={setDate} />
              </Field>
            </section>
          </div>
        </main>
      </div>
    </MotionConfig>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Controls />);

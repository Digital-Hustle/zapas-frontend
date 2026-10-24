import { useState } from "react";
import {
  Amount,
  Badge,
  EmptyState,
  ErrorState,
  FileDrop,
  Progress,
  RiskBadge,
  Stepper,
  Textarea,
  Field,
} from "../src/index.ts";

export function FoundationExample() {
  const [file, setFile] = useState<File | null>(null);
  return (
    <section
      aria-label="Импорт и состояния"
      className="border-border bg-card flex min-w-0 flex-col gap-6 rounded-xl border p-4 md:p-6"
    >
      <h2 className="text-lg font-semibold">Импорт и состояния</h2>
      <Stepper
        currentId="review"
        steps={[
          { id: "upload", label: "Загрузка" },
          { id: "review", label: "Проверка" },
          { id: "import", label: "Импорт" },
        ]}
      />
      <FileDrop
        label="Выберите выписку CSV"
        description="CSV, до 1 МБ. Проверка содержимого выполняется сервером."
        maxSize={1024 * 1024}
        value={file}
        onValueChange={setFile}
      />
      <Progress label="Обработка выписки" value={35} />
      <Field htmlFor="import-note" label="Комментарий">
        <Textarea id="import-note" placeholder="Необязательный комментарий" />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Badge tone="success">Обработан</Badge>
        <RiskBadge level="medium" />
        <RiskBadge level="unknown" />
      </div>
      <p>
        Точная сумма: <Amount value="99999999999999999.99" />
      </p>
      <EmptyState
        title="Нет подходящих операций"
        description="Измените фильтры или загрузите другую выписку."
        filtered
      />
      <ErrorState
        title="Сохранённые данные"
        description="Пример состояния без соединения"
        offline
        traceId="example-import"
      />
    </section>
  );
}

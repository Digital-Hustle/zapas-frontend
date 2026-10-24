import { Link } from "react-router";
import { Button } from "@zapas/ui";

/** Visible on every preview page; never present in a normal build. */
export function PreviewNotice() {
  return (
    <aside
      aria-label="Демонстрационный режим"
      className="border-border bg-warning-soft text-warning-soft-foreground border-b px-6 py-3 text-sm"
    >
      <div className="max-w-content mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold">Демонстрационный стенд · тестовые данные</p>
          <p>
            Письма не отправляются. Почта для входа: demo@example.test · код: <strong>000123</strong>.
          </p>
          <p>Изменения живут в этой вкладке до обновления страницы. Не вводите реальные данные.</p>
          <p>CSV показывает подготовленный демоотчёт и тестовые операции; файл не анализируется.</p>
        </div>
        <nav aria-label="Разделы демо" className="flex flex-wrap items-center gap-3">
          <Link to="/app" className="underline">
            Компании и счета
          </Link>
          <Link to="/demo/forecast" className="underline">
            Пример риска и качества
          </Link>
          <Link to="/demo/jobs" className="underline">
            Пример заданий
          </Link>
          <Button size="sm" variant="secondary" onClick={() => window.location.assign("/login")}>
            Сбросить демо
          </Button>
        </nav>
      </div>
    </aside>
  );
}

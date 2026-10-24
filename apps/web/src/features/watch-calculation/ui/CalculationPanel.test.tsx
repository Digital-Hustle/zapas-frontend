import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CalculationPanel } from "./CalculationPanel.tsx";
import type { Calculation } from "../model/types.ts";
const job = (status: string): Calculation => ({
  id: "job",
  status,
  createdAt: "2026-10-24T00:00:00Z",
  progress: 0,
  resultId: null,
  error: null,
});
const base = {
  canRun: true,
  offline: false,
  stale: false,
  onStart: () => Promise.resolve(),
  onRefresh: () => Promise.resolve(),
  previousResult: <p>Сохранённый прогноз</p>,
};

it("keeps the previous result throughout pending, failed, cancelled, stale and offline states", () => {
  for (const status of ["QUEUED", "RUNNING", "FAILED", "CANCELLED", "UNKNOWN"]) {
    const html = renderToStaticMarkup(<CalculationPanel {...base} job={job(status)} stale offline />);
    expect(html).toContain("Сохранённый прогноз");
    expect(html).toContain("Результат устарел");
    expect(html).toContain("Нет соединения");
  }
});

it("distinguishes no result, queued, running and terminal statuses", () => {
  const cases: [Calculation | null, string][] = [
    [null, "Расчёт ещё не запускался"],
    [job("QUEUED"), "В очереди"],
    [job("RUNNING"), "Выполняется"],
    [job("FAILED"), "Расчёт завершился ошибкой"],
    [job("CANCELLED"), "Расчёт отменён"],
  ];
  for (const [value, label] of cases) {
    expect(renderToStaticMarkup(<CalculationPanel {...base} job={value} />)).toContain(label);
  }
});

it("does not claim a successful result when its reference is absent", () => {
  expect(renderToStaticMarkup(<CalculationPanel {...base} job={job("SUCCEEDED")} />)).toContain(
    "Ссылка на результат отсутствует",
  );
});

it("treats prototype-like status strings as unknown", () => {
  expect(renderToStaticMarkup(<CalculationPanel {...base} job={job("toString")} />)).toContain(
    "Неизвестное состояние расчёта",
  );
});

it("shows persistent job failure details and prevents readonly launch", () => {
  const html = renderToStaticMarkup(
    <CalculationPanel
      {...base}
      canRun={false}
      job={{
        ...job("FAILED"),
        error: { detail: "Не хватает подтверждённых данных", traceId: "trace-example" },
      }}
    />,
  );
  expect(html).toContain("Не хватает подтверждённых данных");
  expect(html).toContain("trace-example");
  expect(html).not.toContain("Запустить новый расчёт");
});

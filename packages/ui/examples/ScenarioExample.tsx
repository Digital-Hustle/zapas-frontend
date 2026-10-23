import { useState } from "react";
import { Slider, RangeSlider, Tabs } from "../src/index.ts";

const percent = (value: number) => `${value}%`;

export function ScenarioExample() {
  const [value, setValue] = useState(20);
  const [range, setRange] = useState<[number, number]>([10, 40]);
  const [tab, setTab] = useState("parameters");
  return (
    <section
      aria-label="Слайдеры и вкладки"
      className="border-border bg-card flex flex-col gap-4 rounded-xl border p-4 md:p-6"
    >
      <h2 className="text-lg font-semibold">Параметры сценария</h2>
      <p className="text-muted-foreground text-sm">Пример контролов. Финансовый прогноз не рассчитывается.</p>
      <Tabs
        label="Настройки сценария"
        value={tab}
        onValueChange={setTab}
        items={[
          {
            value: "parameters",
            label: "Параметры",
            content: (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-medium">Изменение параметра: {percent(value)}</p>
                  <Slider
                    label="Изменение параметра"
                    value={value}
                    onValueChange={setValue}
                    min={0}
                    max={100}
                    step={5}
                    formatValue={percent}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Диапазон: {percent(range[0])} — {percent(range[1])}
                  </p>
                  <RangeSlider
                    label="Диапазон изменения"
                    thumbLabels={["Нижняя граница", "Верхняя граница"]}
                    value={range}
                    onValueChange={setRange}
                    min={0}
                    max={100}
                    step={5}
                    minStepsBetweenThumbs={1}
                    formatValue={percent}
                  />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Недоступный параметр</p>
                  <Slider label="Недоступный параметр" value={30} onValueChange={setValue} disabled />
                </div>
              </div>
            ),
          },
          { value: "unavailable", label: "Расчёт", disabled: true, content: null },
          {
            value: "help",
            label: "Справка",
            content: (
              <p className="text-sm">
                Стрелки меняют значение на один шаг, Home и End выбирают границы шкалы. Вкладки переключаются
                стрелками. Для расчёта нужен подключённый backend.
              </p>
            ),
          },
        ]}
      />
    </section>
  );
}

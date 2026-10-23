import { useState } from "react";
import { Link } from "react-router";
import { Field, Select, Tabs, buttonVariants } from "@zapas/ui";
import { Logo } from "@/shared/ui";
import { riskExample, qualityExample } from "./model/examples.ts";
import { RiskDetails } from "./ui/RiskDetails.tsx";
import { QualityDetails } from "./ui/QualityDetails.tsx";

export function ForecastInsightsPreview() {
  const [tab, setTab] = useState("risk");
  const [riskCase, setRiskCase] = useState("INSUFFICIENT_HISTORY");
  const [qualityCase, setQualityCase] = useState("PARTIAL");
  const risk =
    riskCase === "AVAILABLE"
      ? {
          ...riskExample,
          availability: riskCase,
          probability: 0.3,
          scenarioCount: 1200,
          originCount: 12,
          shortfallP50: "42000.00",
          shortfallP90: "70000.00",
        }
      : { ...riskExample, availability: riskCase };
  return (
    <div className="bg-background min-h-svh">
      <header className="border-border border-b">
        <div className="max-w-content mx-auto flex items-center justify-between gap-4 p-6">
          <Logo />
          <Link to="/" className={buttonVariants({ size: "sm", variant: "ghost" })}>
            На главную
          </Link>
        </div>
      </header>
      <main className="max-w-content mx-auto flex flex-col gap-8 px-6 py-8">
        <div>
          <p className="text-primary-soft-foreground bg-primary-soft w-fit rounded-full px-3 py-1 text-sm font-medium">
            Смоделированный пример
          </p>
          <h1 className="mt-4 text-3xl font-semibold">Риск и качество — витрина v1</h1>
          <p className="text-muted-foreground mt-3 max-w-3xl">
            Только для разработки. Значения фиксированы; это не результат по данным компании. Здесь
            проверяется отображение, подключение API выполняется отдельно.
          </p>
        </div>
        <Tabs
          label="Представления прогноза"
          value={tab}
          onValueChange={setTab}
          items={[
            {
              value: "risk",
              label: "Риск",
              content: (
                <div className="flex flex-col gap-8">
                  <div className="max-w-sm">
                    <Field label="Доступность вероятности" htmlFor="risk-case">
                      <Select
                        id="risk-case"
                        value={riskCase}
                        onValueChange={setRiskCase}
                        options={[
                          { value: "INSUFFICIENT_HISTORY", label: "Недостаточно истории" },
                          { value: "AVAILABLE", label: "Оценка доступна" },
                          { value: "INPUT_INCOMPLETE", label: "Неполные данные" },
                          { value: "UNKNOWN", label: "Неизвестное состояние" },
                        ]}
                      />
                    </Field>
                  </div>
                  <RiskDetails data={risk} />
                </div>
              ),
            },
            {
              value: "quality",
              label: "Качество",
              content: (
                <div className="flex flex-col gap-8">
                  <div className="max-w-sm">
                    <Field label="Состояние проверки" htmlFor="quality-case">
                      <Select
                        id="quality-case"
                        value={qualityCase}
                        onValueChange={setQualityCase}
                        options={[
                          { value: "PARTIAL", label: "Частичный результат" },
                          { value: "COMPLETE", label: "Завершённый результат" },
                          { value: "EMPTY", label: "Проверки ещё нет" },
                        ]}
                      />
                    </Field>
                  </div>
                  <QualityDetails
                    data={qualityCase === "EMPTY" ? null : { ...qualityExample, status: qualityCase }}
                  />
                </div>
              ),
            },
          ]}
        />
      </main>
    </div>
  );
}

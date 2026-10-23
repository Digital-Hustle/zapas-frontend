import { useState } from "react";
import { Checkbox, RadioGroup, Segmented, Switch } from "../src/index.ts";

export function SelectionExample() {
  const [email, setEmail] = useState(true);
  const [inApp, setInApp] = useState(false);
  const [delivery, setDelivery] = useState("digest");
  const [horizon, setHorizon] = useState("30");
  const all = email && inApp ? true : email || inApp ? "indeterminate" : false;
  return (
    <section
      aria-label="Переключатели и выбор"
      className="border-border bg-card flex flex-col gap-6 rounded-xl border p-4 md:p-6"
    >
      <h2 className="text-lg font-semibold">Настройки уведомлений</h2>
      <div className="flex items-center gap-2">
        <Checkbox
          id="all-channels"
          checked={all}
          onCheckedChange={(next) => {
            setEmail(next === true);
            setInApp(next === true);
          }}
        />
        <label htmlFor="all-channels" className="text-sm font-medium">
          Все каналы
        </label>
      </div>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="email-channel" className="text-sm">
          Email-уведомления
        </label>
        <Switch id="email-channel" checked={email} onCheckedChange={setEmail} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor="app-channel" className="text-sm">
          В приложении
        </label>
        <Switch id="app-channel" checked={inApp} onCheckedChange={setInApp} />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Частота уведомлений</legend>
        <RadioGroup
          label="Частота уведомлений"
          value={delivery}
          onValueChange={setDelivery}
          options={[
            { value: "digest", label: "Еженедельный дайджест" },
            { value: "sms", label: "SMS — недоступно", disabled: true },
            { value: "daily", label: "Ежедневно" },
          ]}
        />
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Горизонт прогноза</legend>
        <Segmented
          label="Горизонт прогноза"
          value={horizon}
          onValueChange={setHorizon}
          options={[
            { value: "30", label: "30 дней" },
            { value: "60", label: "60 дней" },
            { value: "90", label: "90 дней" },
          ]}
        />
      </fieldset>
    </section>
  );
}

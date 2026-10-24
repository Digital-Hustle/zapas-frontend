# @zapas/ui

Общие компоненты кабинета и админки. Импорты — из `@zapas/ui`, стили —
`@zapas/ui/styles.css`; в корне приложения нужен `MotionConfig reducedMotion="user"`.

## Импорт, состояния и суммы

`FileDrop` — контролируемый выбор одного файла: `value: File | null`, `onValueChange`,
обязательные `label` и `maxSize` в байтах (из серверной конфигурации). По умолчанию CSV;
другие типы задаются `accept` react-dropzone. Показывает имя/тип/размер, отклоняет пустые,
слишком большие и неподходящие файлы, сохраняет прежний файл при ошибке. `busy` блокирует
замену/удаление. Сам загрузку не выполняет, содержимое проверяет backend. Для multipart
использовать `@zapas/api/preprocessor`, не задавая Content-Type вручную.

`Textarea` поддерживает ref/RHF, `invalid`, стандартные aria-атрибуты.
`EmptyState` принимает `filtered`, описание и действие; `ErrorState` сохраняет описание,
traceId и явный retry (`offline` блокирует его). `Badge`, `StatusDot`, `RiskBadge`
дублируют состояние иконкой/текстом; уровень риска передаёт mapper, компонент его не считает.
`Progress` принимает `null` для неизвестного прогресса; `Stepper` — текущий id шага.

`formatMoney`/`formatMoneyCompact` форматируют decimal strings через BigInt без потери
копеек. `Amount` озвучивает точную строку; NumberFlow используется только в безопасном
диапазоне, при reduced motion остаётся статичный текст. `toNumber` допустим только для
координат, никогда для расчёта финансовых данных.

Основа FileDrop: [react-dropzone 20.1.4](https://github.com/react-dropzone/react-dropzone), MIT.
Проверки этого этапа: 41 UI unit-тест; 12 вариантов браузерной матрицы (360/768/1440,
темы, reduced motion), выбор/отказ/очистка CSV, axe без нарушений. Витрина ниже содержит
секцию «Импорт и состояния».

## T-F2-05 — выбор значения и даты

Первый этап: Select на Radix и DatePicker на Radix Popover + react-day-picker.
Оба контрола используют токены, поддерживают label через Field, ошибки через
`aria-describedby`, disabled и управление фокусом с клавиатуры.

DatePicker принимает и возвращает календарную дату `YYYY-MM-DD` без времени
и преобразований в UTC. Пустое значение — `undefined`.

```tsx
<Field label="Категория" htmlFor="category" error={error}>
  <Select id="category" value={category} onValueChange={setCategory}
    options={[{ value: "rent", label: "Аренда" }]}
    invalid={Boolean(error)} aria-describedby={error ? "category-error" : undefined} />
</Field>
<Field label="Дата платежа" htmlFor="date">
  <DatePicker id="date" value={date} onValueChange={setDate} />
</Field>
```

Оба компонента передают `ref` и `onBlur` триггеру для RHF Controller.
Select предназначен для небольших справочников (до 100 вариантов), поддерживает
`loading`, пустой список, отключённые опции, `name` и `required`. Ошибка запроса
остаётся в Field с `invalid`; повтор запроса реализует форма.
DatePicker поддерживает `required`, `disabledDates` (Matcher react-day-picker)
и очистку необязательной даты. Некорректный `value` помечается `aria-invalid`.
Внешний label обязателен: Field + id либо `aria-label`.

## Проверка в браузере

`pnpm dev:ui` из корня → [локальная витрина](http://localhost:5174).
Она показывает форму, loading/empty/validation/disabled и переключение темы,
не обращаясь к API. Клавиатура: Tab, Enter, стрелки, Escape; календарь также
поддерживает PageUp/PageDown. Витрина использует уже установленный Vite web-пакета.

При запущенной витрине: `pnpm --filter @zapas/web exec playwright install chromium`,
затем `pnpm test:ui-browser`. Проверяются 360/768/1440, обе темы/reduced motion,
axe для списка и календаря, фокус и выбор 29 февраля в трёх часовых поясах.
Снимки сохраняются в `test-results/ui` (не коммитятся).

[Checkbox, Switch, RadioGroup и Segmented](docs/selection-controls.md) также доступны
из публичного API. Они управляются значением формы, передают name/ref и поддерживают
клавиатуру, disabled и reduced motion.

[Slider, RangeSlider и Tabs](docs/sliders-tabs.md) добавляют параметры сценария
и панели с клавиатурной навигацией. Ref слайдера фокусирует первый бегунок.

Остальные компоненты T-F2-05 и админка остаются отдельными задачами.

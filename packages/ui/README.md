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

MoneyInput также сохраняет до 17 цифр целой части и две копейки без Number,
объединяет внутренний blur с RHF callback и оставляет неверный ввод для исправления.
Для знакового остатка передать `allowNegative`; без него отрицательное значение
отклоняется, а не превращается незаметно в положительное.

OtpInput передаёт ref/id/name/onBlur/aria-describedby для формы, поддерживает
`invalid`, paste/autocomplete, не завершает disabled-ввод и помещается в 360 px.
`ResendCode` принимает абсолютный `resendAt` (epoch milliseconds) и `onResend`:
новый deadline родитель берёт из ответа Auth/Profile, не выдумывает локально.
`null`/неизвестный срок не разрешает немедленный повтор. Pending блокирует повтор,
ошибка сохраняется без auto retry. Каретка/ошибка OTP учитывают reduced motion.
Button `loading` всегда блокирует действие, включая явный `disabled={false}`;
для `asChild` выставляются aria-disabled/busy, снимается Tab и блокируется click.

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

## Поиск, диапазоны, меню и таблицы

`Combobox` и `MultiSelect` принимают `options` как Select, ref/onBlur и aria-атрибуты
для формы. Варианты >100 виртуализируются; поиск и стрелки/Home/End/Enter работают по
всему списку. MultiSelect принимает массив строк, сохраняет выбранные значения при
фильтрации и передаёт повторяющиеся hidden `name` в форму. Для async-справочника:
`remote`, `onSearchChange`, `loading`, `error`; запрос, AbortSignal и защита от устаревших
ответов остаются в query-слое клиента. Компонент не делает fetch.

`DateRangePicker` возвращает только полный `{from,to}` из календарных дат. Escape
отменяет незавершённый выбор. `today` задаёт бизнес-дату для пресетов; «30 дней»
включает текущую дату и предыдущие 29, «Квартал» — текущий календарный квартал.
При `disabledDates` пресеты отключены; календарь не включает запрещённые дни.

`TooltipProvider` в корне приложения объединяет delay/skip-delay 300 мс из tokens;
`Tooltip` и `Popover` принимают один доступный trigger element. `DropdownMenu` и
`ContextMenu` — `MenuItem[]` с disabled/danger/separatorBefore. `ScrollArea` требует
label и заданную высоту; ref ведёт на viewport. `CommandPalette` открывается Ctrl/Cmd+K
вне текстового ввода; принимает доступные доменные actions. Проверка прав остаётся
обязанностью приложения/backend.

`Dialog` возвращает фокус вызывающему элементу даже при внешнем управлении open;
`Sheet` принудительно использует нижнюю шторку, `AlertDialog` блокирует закрытие и
повторный submit во время операции, сохраняет ошибку и не делает auto retry.

`Table`/`VirtualTable` принимают `ColumnDef<T>[]`, data, label и стабильный `getRowId`.
Сортировку включать явно для нужного столбца через `enableSorting`; для серверной
пагинации обязательны `manualSorting`, `sorting`, `onSortingChange`. Таблица не
превращает строки денег в Number и не угадывает финансовую сортировку. Selection
контролируется через `selection`/`onSelectionChange`; приложение очищает его при смене
company/account. Выбор всех относится к загруженным строкам. Loading — Skeleton;
ошибка refetch сохраняет строки. VirtualTable использует TanStack Virtual и показывает
только видимые строки с aria-rowcount/aria-rowindex. Для выгрузки всех данных нужен
серверный экспорт, печать виртуальной области не является таким экспортом.

Основы: Radix 1.8.1, cmdk 1.1.1, TanStack Table 8.21.3 и Virtual 3.14.22 (MIT).
Mutable instances TanStack изолированы в функциях `use no memo`: React Compiler
не должен мемоизировать их методы. Проверены реальные scroll/keyboard в Chromium.

Этап навигации: 49 UI unit-тестов, 12 сочетаний браузерной матрицы; axe проверяет
также открытые поиск, календарь периода, подтверждение и палитру. Клавиатура достигает
250-го варианта, виртуальная таблица — 500-й строки при ограниченном числе DOM-строк.

## Запуск витрины

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

## Контраст hover

Danger, danger-soft и soft используют отдельные семантические hover tokens.
Hover/foreground пары проверяются генератором на 4.5:1 в обеих темах; opacity
модификатор фона больше не ослабляет контраст destructive-действий. В браузерную
матрицу включён axe после наведения на три варианта.

# @zapas/ui

Общие компоненты кабинета и админки. Импорты — из `@zapas/ui`, стили —
`@zapas/ui/styles.css`; в корне приложения нужен `MotionConfig reducedMotion="user"`.

## T-F2-05 — выбор значения и даты

Первый этап: Select на Radix и DatePicker на Radix Popover + react-day-picker.
Оба контрола используют токены, поддерживают label через Field, ошибки через
`aria-describedby`, disabled и управление фокусом с клавиатуры.

DatePicker принимает и возвращает календарную дату `YYYY-MM-DD` без времени
и преобразований в UTC. Пустое значение — `undefined`.

Остальные компоненты T-F2-05 и админка остаются отдельными задачами.

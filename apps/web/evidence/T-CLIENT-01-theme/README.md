# T-CLIENT-01: выбор темы

Матрица 360/768/1440 × light/dark. PNG показывают открытый Popover с
RadioGroup и клавиатурным фокусом. 360 — reduced motion; остальные — normal.

9 Playwright: выбор до входа, фокус/клавиатура, localStorage/reload, явный
override ОС, live system, недоступный storage, неизвестное сохранённое значение,
axe без serious/critical и отсутствие горизонтального overflow.

Root: 148 Vitest +34 tooling, frontend/contracts/tooling/security passed.
Полный E2E: 118 passed +1 гонка transient toast; исправлено ожиданием закрытия,
все 6 затронутых вариантов формы passed повторно. Общие UI/API/токены не изменены.

Следующий этап: отдельная страница организации и навигация.

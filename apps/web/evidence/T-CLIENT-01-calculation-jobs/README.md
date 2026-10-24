# T-CLIENT-01 — lifecycle расчёта

Hub abe85d7; PR https://github.com/Digital-Hustle/zapas-frontend/pull/11,
поверх #10. Публичный доменный loader внедряется с F2 API; здесь нет fetch,
самостоятельного CSRF/refresh или финансового расчёта.

`useCalculation` использует company/account/job query key и AbortSignal.
QUEUED/RUNNING: 1 с первые 10 с, затем 2 с до 30 с, затем 5 с.
SUCCEEDED/FAILED/CANCELLED/unknown и ошибка чтения прекращают polling;
после outage требуется явное обновление. Уход с экрана отменяет in-flight read.

`CalculationPanel` сохраняет предыдущий результат при запуске, failed,
cancelled, stale, offline и read error. Progress — серверные 0…100, не вероятность.
Readonly запрещает запуск/отмену; pending защищён от двойной команды.
Финансовый результат загружается после resultId отдельным API-этапом.

Проверки 24.10.2026:

- `node tools/check.mjs frontend contracts tooling security`: pass,
  64 Vitest (11 новых), 12 tooling, lint/typecheck/build/guard.
- Полный Playwright/Chrome: 19 pass (7 landing + 6 insights + 6 jobs).
- Шесть сочетаний 360/768/1440 × light/dark, reduced motion, клавиатурное
  обновление, offline/readonly/read error, явный повтор, cancel, double click;
  axe без serious/critical, без overflow/page errors/API calls в dev-витрине.
- Unit: реальный QueryClient с управляемым loader/часами, terminal stop,
  AbortSignal при unmount, изоляция cache по счёту, остановка после outage;
  состояния панели, отсутствие resultId, unknown/prototype enum, деньги не меняются.
- Снимки всех шести сочетаний. Desktop dark и mobile light просмотрены.

Dev-витрина `/dev/calculation-jobs` не входит в исполняемые production bundles;
данные фиксированы и явно помечены. Локальный gitleaks отсутствует, scan — CI.

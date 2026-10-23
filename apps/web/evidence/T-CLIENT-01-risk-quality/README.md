# T-CLIENT-01 — представления риска и качества

Hub abe85d7; PR https://github.com/Digital-Hustle/zapas-frontend/pull/10,
поверх #9. Независимые отображения по подготовленным доменным моделям.
Реальные DTO/query/mappers/HTTP зависят от F2 API и здесь не подключены.

Dev-витрина: `/dev/forecast-insights` в `pnpm dev`.
Фиксированные данные явно помечены. Исполняемые production bundles не содержат
маршрута/витрины/fixtures; исходная строка dev-route остаётся в sourcemap router.
Production кабинет не получает эти данные.

Проверки 24.10.2026:

- Общий `node tools/check.mjs frontend contracts tooling security`: pass,
  53 Vitest (8 новых), 12 tooling; lint/typecheck/build/guard.
- Полный Playwright/Chrome: 13 pass — 7 landing и 6 insights.
- 360/768/1440 × обе темы, reduced motion, клавиатурный переход вкладок,
  available/unavailable probability, empty quality, stale/partial, единицы,
  axe без serious/critical, без overflow/page errors/запросов API в витрине.
- Unit: null и invalid probability, истинный 0 только для AVAILABLE,
  unknown enum, точная сумма вне safe integer, согласование рекомендаций,
  nullable/отсутствующий backtest и отдельные метрики/counts/skipped reasons.
- Просмотрены desktop dark risk и mobile light quality.

Скриншоты всех шести сочетаний — risk-* и quality-*.
Локальный Gitleaks отсутствует; security scan выполняется обязательным CI.

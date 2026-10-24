# Preview checkpoint evidence

По прямой команде владельца подготовленные F1 PR объединены с временными F2
моками для публичного просмотра. Основной адрес digital-hustle.ru; код000123.
Backend не запущен. Включение/удаление: docs/PREVIEW-MOCKS.md от корня frontend.

Проверки финальной сборки: contracts/frontend/tooling/security, 148 unit +22 tooling,
все110 обычных Playwright. `pnpm test:demo-browser` строит normal и demo production
bundles, доказывает отсутствие demo API/fixtures в normal, затем проходит весь flow
на 360/768/1440 × light/dark, normal/reduced motion: OTP, CRUD, signed balance,
CSV/report, single/bulk category, archive, profile, reset и logout. Во всех шести
сочетаниях axe0, без overflow/page errors и без настоящих network API requests.
Clock не подменяется: normal-motion после полного reset проверяется с нативным RAF.

Три снимка скопированы из этого прогона; остальные локальные снимки —
test-results/preview-demo. Визуально просмотрены mobile light и desktop dark.
CSV показывает подготовленный отчёт/тестовые операции, а не разбор загруженного файла.

После CD повторить тот же user flow на публичном домене:
`DEMO_PREVIEW_URL=https://digital-hustle.ru PREVIEW_COMMIT=<sha> pnpm test:demo-browser`.
Скрипт до любых writes требует metadata.mockApi=true/backend=false и демобаннер.
Финальные SHA/mode на сервере подтверждаются deployment.json.
После проверки — остановка для просмотра владельцем; новые функции не начинаются.

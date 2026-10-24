# T-CLIENT-01 — лендинг и график v1

Hub: `abe85d7503b0cb592102c8729dd321b7081f79c4`.
PR: https://github.com/Digital-Hustle/zapas-frontend/pull/9

30 фиксированных будущих точек; 4 дня факта, включая пропуск. Данные
иллюстративные, не измеренный результат. Основной balance и P50 различаются.
Ноль/буфер, граница asOfDate и пропуски видны отдельно; нет склейки рядов.
Тултип/таблица сохраняют копейки исходных строк. Unit-проверка включает сумму
99999999999999999.99, отрицательные/нулевые/null/invalid значения.

Проверено 24.10.2026:

- `node tools/check.mjs frontend contracts tooling security` — pass;
  45 Vitest, 12 tooling, lint/typecheck/build/guard. Contracts проверяет прежний
  pinned ref 7d6b86c, а не миграцию shared API; это отдельная зависимость F2.
- `PLAYWRIGHT_CHANNEL=chrome pnpm --filter @zapas/web e2e` — 7 pass;
  360/768/1440 × light/dark, keyboard disclosure/anchor/login, reduced motion,
  normal motion, axe без serious/critical (включая раскрытую таблицу), overflow,
  отсутствие запросов API на лендинге.
- Локальный gitleaks отсутствует; обязательные Gitleaks/Trivy выполняются CI.

Снимки — шесть полных страниц и desktop hero. Исторические FR-WEB-01 evidence
сохранены отдельно. Production API/интеграция не подтверждаются этими тестами.

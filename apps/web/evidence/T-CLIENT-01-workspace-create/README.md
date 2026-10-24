# Организация / счёт — выбор и создание

Base: Auth/Profile #12@6e7620f (интеграция F2 #17), frontend main 0d2b024, hub 760917f.
Повторная проверка после интеграции: 126 Vitest +22 tooling и все54 Playwright passed.

- 18 PNG: создание организации, создание счёта, выбранный счёт на
  360/768/1440 px × light/dark. Визуально проверены mobile light и desktop dark.
- Все54 Playwright прошли: прежние40 плюс14 workspace. Реальный shared SDK
  с HTTP fixtures; моки не подтверждают runtime Gateway/Orchestrator.
- Проверки: empty/loading/outage/403/404/архив/VIEWER, server pages,
  UUID URL scope, abort/late response при смене компании, сброс account selection,
  null и точная отрицательная сумма -99999999999999999.99, keyboard/dialogs,
  reduced и normal motion, axe без serious/critical, отсутствие overflow.
- Потерянный POST response: повтор сохраняет исходные body/Idempotency-Key;
  429 после потери не меняет ключ, deadline соблюдается. При явном уходе к списку
  требуется подтверждение; отмена подтверждения сохраняет возможность replay.
- node tools/check.mjs frontend contracts tooling security прошёл:
  126 Vitest (tokens4 + UI57 + API16 + charts6 + web43), 22 tooling,
  lint/types/FSD/tokens/contracts/production build/guard. Локального gitleaks нет;
  GitHub security обязателен отдельно.

Текущая часть — выбор/создание, не законченный финансовый dashboard.
Следом редактирование/If-Match/conflict, архивирование и подтверждённый остаток.
Общий слой F2 не изменён. F2 #17 с MoneyInput/OTP подхвачен после merge; evidence обновлён на этих компонентах.

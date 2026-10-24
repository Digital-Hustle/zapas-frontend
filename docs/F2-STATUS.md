# F2 — поставка и границы интеграции, 24 октября 2026

Канонический хаб: `abe85d7503b0cb592102c8729dd321b7081f79c4`.
Бизнес-архитектура из hub #8, основной браузерный Auth/Profile из #9.

| Зона | Реальный результат |
| --- | --- |
| SDK / T-CLIENT-01 | #13: Auth/Profile, Orchestrator, PreProcessor, отдельный legacy/native Auth; внутренние/retired API и SSE удалены |
| Browser transport | Memory CSRF bootstrap, HttpOnly credentials, single-flight refresh, один replay с прежними Idempotency-Key/If-Match, fail-closed при неопределённом refresh, очистка private cache при смене identity |
| Контракты | 75 manifest-owned файлов, pinned SHA/hashes; проверка локальных изменений и всех загрузок до записи, удаление только retired owned файлов |
| UI / T-F2-05 | #14/#15: все примитивы DESIGN §5, включая CSV FileDrop, поиск/мультивыбор, даты, меню/диалоги/палитру, состояния, суммы и виртуальные таблицы |
| Формы | Финальный аудит: точный MoneyInput до 17+2 цифр, явная поддержка знака, ref/ошибки/адаптивность OTP, серверный resend deadline, без двойного submit при loading |
| CI | Линтер/типы/build/контракты/guard, gitleaks/Trivy, личное авторство без AI-подписей; frontend main сохраняет обычные review/last-push требования после разрешённых владельцем merges |
| Preview / T-F2-07 | #16: автоматический deploy проверенного актуального main; non-root SSH, закреплённый host key, immutable release, atomic symlink, smoke и rollback |
| Android review | Android #3 смёржен: CODEOWNERS удалён, approvals=0, code-owner=false, last-push=false; старые запросы miroslavrov из #1/#2 сняты; CI/security сохранены |
| Совмещение F1 | #9–#11 проверены и смёржены с SDK/UI; конфликт маршрутов/статуса #11 разрешён, все витрины сохранены. #12/#18/#20/#21/#22 объединены с итоговыми F2 controls: Auth/Profile, CRUD/архив/остатки, CSV и операции/категории |

Проверки финального общего слоя: 148 unit-тестов (58 UI), 22 tooling, 110 F1 e2e.
UI: 360/768/1440 × светлая/тёмная × reduced motion, клавиатура/фокус, axe 0,
точные копейки, OTP/paste/resend, 250 вариантов поиска, 500 строк виртуальной таблицы.
Commands/evidence: `packages/ui/README.md`, `tools/ui-browser.mjs`, локальный
`test-results/ui` (снимки не коммитятся), CI/PR. Unit/mock-тесты не заменяют backend E2E.

Preview: https://45.146.165.12/ и `/ui/`. Настоящий CD подтверждён успешным
[run #40048405718](https://github.com/Digital-Hustle/zapas-frontend/actions/runs/40048405718).
Текущую версию показывает `/deployment.json`; backend=false — намеренное состояние.

## Что требует F1

Общий SDK и компоненты готовы. F1 ещё подключает свои порты и DTO→domain mapper:
регулярности, планы/allocations, dashboard/alerts, настройки/участники.
Auth/Profile/sessions и guards подключены в смёрженном #12 через SDK v1, с OTP/409/recovery/logout. В #18 смёржены выбор/создание компаний и RUB-счетов: permissions, server pages, UUID scope, точные деньги, стабильный POST replay. Управление/архив/остатки, CSV upload/history/report и операции/категории также включены в чекпоинт. Следующие части F1 на паузе по команде владельца.
Собственный fetch/CSRF в экранах добавлять не нужно: handoff в `F2-API-V1.md`.
Эти страницы не реализованы F2, поскольку `apps/web` — зона F1 и там уже идёт
отдельная работа. Их интеграция с SDK — следующий клиентский этап F1.

## Что требует backend

Владелец уточнил фактический репозиторий: [hack-2026-back](https://github.com/Digital-Hustle/hack-2026-back).
Прежний вывод про scaffold `zapas-backend/main` не относится к нему. В Auth/Profile
PR #1 есть Java 21/PostgreSQL/миграции/Compose/SMTP и успешный verify. PreProcessor
PR #2 и Orchestrator #3–#12 — draft-стек, не завершённая поставка пяти сервисов.

Ветка Gateway `4a33885` пока проверяет HMAC/Bearer вместо RS256/browser cookies,
не устанавливает sid-контекст, не выполняет требуемые strip/CSRF/Origin правила;
конфигурация требует посторонний configserver. AuthCookieManager PR #1 ещё не
очищает legacy cookies согласно ADR-110. Поэтому полный runtime, реальные OTP
и защищённый профиль нельзя считать интегрированными. Нужны совместимый Gateway,
cookie/native compatibility и окончательные health/ports/migrations/images.

Подробные commit/path, различия и условия запуска —
[BACKEND_RUNTIME_STATUS в хабе](https://github.com/Digital-Hustle/zapas/blob/main/docs/BACKEND_RUNTIME_STATUS.md).
На VPS пока нет Docker/backend. После совместимого backend F2 сможет поднять
runtime, две БД/backup/restore, network/IDOR и полный вход→импорт→прогноз E2E.
Signing/SQL/SMTP secrets остаются в серверных secret files, не во frontend.

SMTP TLS/login проверены предыдущим этапом, секрет хранится root-only на VPS.
Публичные MX и SPF digital-hustle.ru указывают на Beget. TXT DMARC при проверке
не обнаружен; селектор DKIM нужно сверить в Beget (default/mail не ответили).
Почтовая доставляемость не подтверждена, письма этим этапом не отправлялись.
Для её настройки может потребоваться доступ владельца к DNS/почтовой панели.

Обязательная админка, ML, broker/Valkey, notify-сервис, SSE, what-if и 90-дневный
горизонт не входят в текущую архитектуру v1 и не создаются как замена зависимостям.

## Деморежим по решению владельца

На публичном preview включены memory-only моки существующих экранов, фиксированный
код 000123 и постоянный демобаннер. Backend остаётся неподключённым; CSV/операции
синтетические, риск/качество/jobs — отдельные примеры. Тестами проверены обе сборки:
normal без demo API/fixtures, preview с полным user flow в шести размерах/темах,
axe0 и нулём настоящих API-запросов, повторным входом/сбросом.
Отключение одним флагом и перечень удаления — [PREVIEW-MOCKS](PREVIEW-MOCKS.md).
После публикации этого чекпоинта работа остановлена для просмотра владельцем.

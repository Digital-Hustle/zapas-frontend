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
| Совмещение F1 | #9–#11 проверены и смёржены с SDK/UI; конфликт маршрутов/статуса #11 разрешён, все витрины сохранены. #12 остаётся незавершённым draft |

Проверки финального общего слоя: 102 unit-теста (57 UI), 22 tooling, 19 F1 e2e.
UI: 360/768/1440 × светлая/тёмная × reduced motion, клавиатура/фокус, axe 0,
точные копейки, OTP/paste/resend, 250 вариантов поиска, 500 строк виртуальной таблицы.
Commands/evidence: `packages/ui/README.md`, `tools/ui-browser.mjs`, локальный
`test-results/ui` (снимки не коммитятся), CI/PR. Unit/mock-тесты не заменяют backend E2E.

Preview: https://45.146.165.12/ и `/ui/`. Настоящий CD подтверждён успешным
[run #40048405718](https://github.com/Digital-Hustle/zapas-frontend/actions/runs/40048405718).
Текущую версию показывает `/deployment.json`; backend=false — намеренное состояние.

## Что требует F1

Общий SDK и компоненты готовы. F1 ещё подключает свои порты и DTO→domain mapper:
Auth/Profile/sessions и guards (#12 draft), компании/счета/роли, CSV и отчёт,
операции/регулярности, планы/allocations, dashboard/alerts, настройки/участники.
Старые формы пока используют legacy http; готовый пакет сам их не мигрирует.
Собственный fetch/CSRF в экранах добавлять не нужно: handoff в `F2-API-V1.md`.
Эти страницы не реализованы F2, поскольку `apps/web` — зона F1 и там уже идёт
отдельная работа. Их интеграция с SDK — следующий клиентский этап F1.

## Что требует backend

Проверен backend main `32da2ed4a1d4748d1b548fa7c5638f2f0d4d21ad`: старый scaffold,
исполняемых Java-сервисов/образов нет, открытых PR на момент проверки нет.
На VPS backend и Docker отсутствуют. Поэтому не выполнены полный runtime v1,
миграции/backup/restore двух SQL БД, network/IDOR/Gateway auth тесты, реальный CSV,
расчёты и сквозной вход→импорт→план→прогноз→качество. Dev Compose двух PostgreSQL
и Mailpit уже есть в хабе; он не является production deployment.

Для продолжения нужны готовая backend-ветка/PR или проверенные образы пяти сервисов,
health/порты, команды миграций, схема ingress и конфигурация Gateway/Auth по ADR-110.
Signing/SQL/SMTP secrets должны передаваться в серверные secret files, не в frontend.
После этого F2 сможет поднять runtime и проверить доставку OTP/сессии/rollback.

SMTP TLS/login проверены предыдущим этапом, секрет хранится root-only на VPS.
Публичные MX и SPF digital-hustle.ru указывают на Beget. TXT DMARC при проверке
не обнаружен; селектор DKIM нужно сверить в Beget (default/mail не ответили).
Почтовая доставляемость не подтверждена, письма этим этапом не отправлялись.
Для её настройки может потребоваться доступ владельца к DNS/почтовой панели.

Обязательная админка, ML, broker/Valkey, notify-сервис, SSE, what-if и 90-дневный
горизонт не входят в текущую архитектуру v1 и не создаются как замена зависимостям.

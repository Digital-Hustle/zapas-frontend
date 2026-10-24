# Frontend «Запас» — инструкции для AI-агентов

Репозиторий web-кабинета, админки, дизайн-системы и API-клиента. Документы, требования и контракты — в хабе `Digital-Hustle/zapas`.

## Перед задачей
1. Хаб: `docs/REPOS.md`, `docs/REQUIREMENTS.md`, `docs/SCREENS.md`, `docs/DESIGN.md`, `docs/WORKFLOW.md`, свой `docs/roles/<код>.md`.
2. Скиллы из текущего хаба (abe85d7): всегда `zapas-dev`; UI — `frontend-react`; API — `contracts-first`; ревью безопасности — `security-fintech`.
3. `docs/DELIVERY.md` в хабе: не выдавай skeleton за реализованный экран.

## Зоны
| Путь | Владелец | Не трогать без владельца |
|---|---|---|
| `apps/web` | F1 | `pages`, `widgets`, `features`, `entities` web |
| `packages/charts` | F1 | — |
| `apps/admin`, `packages/{tokens,ui,api,config}` | F2 | — |
| `contracts/`, `hub.lock.json` | только синхронизация | вручную не редактировать |
| `.github/`, root config | F2 | — |

## Обязательные правила
- Данные сервера — TanStack Query через `@zapas/api`; Zustand только UI-состояние. DTO → mapper → доменная модель, в компонентах DTO нет.
- Формы RHF + zod; backend валидирует повторно. Ошибка поля — под полем, ошибка операции — `notify`.
- Все контролы и диалоги — `@zapas/ui`. Нативные `select/date/number/alert/confirm` запрещены. Скрытый `input type=file` допустим только внутри FileDrop.
- Только токены; литералы цветов/радиусов/таймингов ловит `zapas-check`. Анимация не задерживает ввод и уважает reduced motion.
- Графики — только отображение серверных значений; деньги не пересчитывать, `number` — координаты.
- Обязательные состояния: loading, empty, filtered-empty, error, unauthorized, stale/partial, offline.
- Секреты/токены не в localStorage. Cookies HttpOnly; refresh single-flight, transient-сбой не разлогинивает.
- Личные коммиты/PR, без AI/agent-подписей. Генерируемые файлы не править.

## Команды
```bash
node tools/check.mjs changed
pnpm check
pnpm gen:tokens && pnpm gen:api
node tools/hub/sync.mjs
```
«Готово» = проверки зелёные, поведение проверено руками в 360/768/1440, светлой/тёмной темах, клавиатурой и reduced motion; PR с evidence.

После merge: `git fetch --prune`, `main` ff-only, активную свою ветку — rebase. Не продолжать смёрженную ветку; удалять только свои подтверждённо смёрженные ветки (WORKFLOW §9).
## Handoff v1 для F2

Контракты закреплены в hub.lock.json на объединённом хабе PR #8/#9. Основной браузер: @zapas/api/auth-profile; бизнес-данные: @zapas/api/orchestrator; CSV: @zapas/api/preprocessor. Android/legacy — отдельный @zapas/api/auth. Новые клиенты используют browserHttp: CSRF из bootstrap в памяти, HttpOnly cookies, refresh single-flight без автоматического retry неопределённого результата. Внутренние endpoints и retired ledger/planning/notify/SSE не экспортируются. Переход экранов F1 описан в docs/F2-API-V1.md.

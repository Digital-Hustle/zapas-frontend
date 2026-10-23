# Frontend «Запас»

Web-кабинет, админка, дизайн-система и API-клиент. Документы проекта — в хабе [Digital-Hustle/zapas](https://github.com/Digital-Hustle/zapas).

**Статус:** лендинг с явно смоделированным графиком, FAQ и пояснением о точности; вход по коду на моках, базовый UI-кит, токены, API-клиент. Дашборд — skeleton, админка и интерактивные графики кабинета ещё не реализованы.

## Быстрый старт
```bash
pnpm install --frozen-lockfile
node tools/setup.mjs        # хуки, локальный конфиг git, .claude/skills
pnpm dev                    # web на http://localhost:5173, проксирует /api на localhost:8080
pnpm dev:mock               # web против Prism-моков контрактов (http://localhost:4010)
pnpm check                  # tokens, lint, typecheck, tests, build, contracts, security
```

Требуется Node 24 и pnpm 10. Реальный backend не нужен для UI-работы: контракты синхронизированы из хаба, Prism отдаёт схемные ответы.

## Структура
| Путь | Что | Владелец |
|---|---|---|
| `apps/web` | лендинг, кабинет, FSD-слои `app/pages/widgets/features/entities/shared` | F1 |
| `apps/admin` | админка (ещё не создана) | F2 |
| `packages/tokens` | единственный источник дизайн-значений → CSS/JSON/документ | F2 |
| `packages/ui` | Radix + motion, единые уведомления/диалоги | F2 |
| `packages/charts` | базовый ForecastChart; интерактивный прогноз и план-факт — следующие задачи | F1 |
| `packages/api` | Orval-клиент из контрактов, http-клиент с refresh/CSRF | F2 |
| `packages/config` | eslint, prettier, tsconfig, `zapas-check` | F2 |
| `contracts/` | синхронизированная копия контрактов хаба; **не редактировать** | B1/владельцы |

## Документы, без которых не начинать
- [REQUIREMENTS](https://github.com/Digital-Hustle/zapas/blob/main/docs/REQUIREMENTS.md) — FR/NFR с ID.
- [DESIGN](https://github.com/Digital-Hustle/zapas/blob/main/docs/DESIGN.md) — токены, суперэллипс, движение, компоненты.
- [SCREENS](https://github.com/Digital-Hustle/zapas/blob/main/docs/SCREENS.md) — маршруты и состояния.
- [AGENT_GUIDE](https://github.com/Digital-Hustle/zapas/blob/main/docs/AGENT_GUIDE.md) — промпт для агента.
- Скиллы: `zapas-dev`, `frontend-react`, `contracts-first`, `security-fintech` и профильные.

## Контракты и токены
Контракты приходят из хаба. Обновление после merge контрактного PR:
```bash
node tools/hub/sync.mjs       # сверяет manifest, обновляет contracts/ и hub.lock.json
pnpm gen:api                  # перегенерировать @zapas/api
```
CI падает, если локальные контракты не совпадают с `contracts/manifest.json` или `hub.lock.json`.
`packages/tokens` — источник для Android (`dist/tokens.json` публикуется как артефакт).

## Правила
- Только PR, личный GitHub-аккаунт, без AI-подписей; обязательные проверки `summary` и `security`.
- Цвета/радиусы/тайминги — только из токенов; нативные контролы и системные диалоги запрещены.
- Генерируемые файлы (`packages/api/src/generated`, `packages/tokens/dist`) руками не править.
- После merge: `git fetch --prune`, `main` только fast-forward, свою активную ветку — rebase. См. WORKFLOW §9 хаба.
- Деньги приходят строкой; считать на клиенте нельзя.

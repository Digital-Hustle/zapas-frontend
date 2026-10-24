# Frontend «Запас»

Web-кабинет, админка, дизайн-система и API-клиент. Документы проекта — в хабе [Digital-Hustle/zapas](https://github.com/Digital-Hustle/zapas).

**Статус (24.10.2026):** готовы лендинг, вход по email-коду, профиль и сессии, организации/счета
(CRUD, архив, остатки), импорт CSV с отчётом, операции и категории (одиночная и массовая правка).
Готовы UI-кит, токены, SDK v1 по четырём публичным контрактам и browser transport.
**Не начаты** прогнозные экраны кабинета: dashboard, график остатка, разрывы, алерты, регулярности,
планы и качество — это зона F1, работа приостановлена по команде владельца. `apps/admin` не создана
(админка не входит в v1). Публичный preview работает на memory-only моках
(`demo@example.test`, код `000123`); backend не подключён, `/api/*` возвращает 503.

## Быстрый старт
```bash
pnpm install --frozen-lockfile
node tools/setup.mjs        # хуки, локальный конфиг git, .claude/skills
pnpm dev                    # web на http://localhost:5173, проксирует /api на localhost:8080
pnpm dev:mock               # web против локального API-мока (см. docs/CONTRACT-MOCKS.md)
pnpm contracts:mock         # только Prism-мок публичных контрактов на http://localhost:4010
pnpm contracts:mock:web     # Prism + web одним процессом
pnpm check                  # tokens, lint, typecheck, tests, build, contracts, security
```

Требуется Node 24.18+ и pnpm 10 (Prism требует Node >=24.18). Реальный backend не нужен для UI-работы:
контракты синхронизированы из хаба. `contracts:mock` отдаёт схемные примеры четырёх публичных
контрактов; auth, CSRF и сценарии с сохранением состояния покрывает встроенный preview API
(`VITE_PREVIEW_MOCKS=1`). Мок не заменяет backend и не проверяет права доступа — подробности и
ограничения в [docs/CONTRACT-MOCKS.md](docs/CONTRACT-MOCKS.md).

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

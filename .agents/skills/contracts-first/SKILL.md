---
name: contracts-first
description: Изменение или добавление REST-эндпоинтов и событий в «Запас» — OpenAPI 3.1 в contracts/openapi, JSON Schema событий в contracts/events, генерация клиентов (orval, openapi-generator), моки prism, проверка совместимости oasdiff. Используй перед любым новым эндпоинтом, полем ответа, событием между сервисами.
---

# Contract-first

## Где что
| Файл | Что |
|---|---|
| `contracts/openapi/_shared.yaml` | общие типы (Money, Problem, Job, PageMeta, ErrorCode), параметры, ответы ошибок |
| `contracts/openapi/<svc>.yaml` | auth, ledger, planning, forecast, forecast-ml, notify |
| `contracts/events/events.json` | **источник** событий → `node tools/contracts/gen-events.mjs` генерирует `*.schema.json` и README |
| `contracts/redocly.yaml` | правила линтера |
| `docs/API.md` | соглашения (ошибки, пагинация, идемпотентность) — соблюдай |

## Порядок
1. Ветка `contract/<ID>-<slug>`, меняешь только `contracts/**`.
2. Правила:
   - деньги `$ref: '_shared.yaml#/components/schemas/Money'` (строка), никогда `number`;
   - коллекции — объект `{ items, ... }`, не массив;
   - пути `/companies/{companyId}/...`, параметр `$ref: '_shared.yaml#/components/parameters/CompanyId'`;
   - каждое действие: `operationId` (camelCase, уникальный), `tags`, ответы 4xx из `_shared.yaml#/components/responses/*`;
   - внутренние — `/internal/v1/...`, `tags: [internal]`, `security: [serviceAuth: []]` (в клиенты не попадают);
   - описания с запятыми в однострочной записи — в кавычках: `description: 'а, б'`;
   - новое поле в ответе — не обязательное (или добавляй в `required` только в новой версии).
3. `node tools/check.mjs contracts` (redocly lint + проверка событий).
4. PR, ревью владельцев-потребителей (CODEOWNERS). После merge:
   - фронт: `pnpm --filter @zapas/api gen` (orval → `packages/api/src/generated/*.ts`);
   - Android: `./gradlew :core:network:openApiGenerate`;
   - бэкенд реализует; CI сравнит springdoc-экспорт с контрактом (`tools/contracts/diff-openapi.mjs`, oasdiff).

## События
- Добавь объект в `events.json` (`type`, `version`, `producer`, `consumers`, `required`, `properties`), запусти генератор, закоммить результат.
- Ломающее изменение = новая `version` (новый стрим `zapas.<type>.v2`), старая живёт, пока потребители не перейдут.
- В payload нет ПДн, кроме явно нужных (email для письма) — и тогда в описании указано, что потребитель удаляет запись после обработки.

## Моки
`pnpm contracts:mock` → `http://localhost:4010/api/v1/<svc>/...` (prism, dynamic). Web: `pnpm --filter @zapas/web dev:mock`.

## Нельзя
- Ломать контракт после T+12:00 (только добавлять).
- Править `generated/` руками.
- Реализовывать эндпоинт, которого нет в контракте.

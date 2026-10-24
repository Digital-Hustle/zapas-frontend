# Локальный мок публичных контрактов

`pnpm contracts:mock` поднимает Prism на `http://127.0.0.1:4010` по четырём публичным контрактам:
`auth-profile.yaml`, `auth.yaml`, `orchestrator.openapi.yaml`, `preprocessor-upload.openapi.yaml`.
Это инструмент UI-разработки, **не backend**.

## Команды

```bash
pnpm install --frozen-lockfile
pnpm contracts:mock                 # только Prism
pnpm contracts:mock --port 4210     # другой порт (или PRISM_PORT=4210)
pnpm contracts:mock:web             # Prism + pnpm dev:mock
pnpm contracts:mock --help
```

Требуется Node >=24.18 (ограничение `@stoplight/prism-cli`); CI и README закрепляют эту версию.

## Что делает лаунчер

1. Бандлит четыре контракта через Redocly во временный каталог (в репозиторий ничего не пишется).
2. Объединяет их в один документ:
   - каждому сервису добавляется внешний префикс (`/api/v1/auth`, `/api/v1/orchestrator`,
     `/api/v1/preprocessor`; auth-profile уже содержит полный путь);
   - `operationId`, схемы, security-схемы и `$ref` получают namespace сервиса, чтобы одинаковые
     имена (`Id`, `Problem`, `getMe`) не конфликтовали;
   - пути и операции с тегом `internal` не попадают в публичный мок;
   - security снимается **только в моке**, чтобы UI получал примеры без auth. Контракты в
     `contracts/` не изменяются.
3. Запускает Prism на loopback. Временный документ удаляется при завершении.

Если контракт содержит внешний `$ref`, коллизию путей или операций, лаунчер падает, а не
подменяет контракт молча.

## Границы

- Prism отдаёт **примеры из схем**, а не бизнес-логику: нет OTP, CSRF-привязки, refresh-ротации,
  ролей, CompanyScope, дедупликации CSV и сохранения данных.
- Ответы не меняются после POST/PUT; сценарии с состоянием, вход по коду `000123` и демобаннер
  покрывает встроенный preview API (`VITE_PREVIEW_MOCKS=1`, `docs/PREVIEW-MOCKS.md`).
- 401/403/409/422 из мока не доказывают поведение backend. Реальные проверки — backend E2E
  (`T-INT-01`) и контрактные тесты соответствующего сервиса.
- Мок слушает только `127.0.0.1`; параметра `--host` намеренно нет.

## Проверки

```bash
node --test tools/tests/contracts-mock.test.mjs
node tools/check.mjs tooling
```

Тест покрывает namespace/коллизии, фильтр internal, валидацию порта, остановку дочерних
процессов и очистку обработчиков сигналов.
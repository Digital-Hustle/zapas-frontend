# F2: общий API v1

Часть T-CLIENT-01: общий пакет, генерация, transport и синхронизация frontend.
Хаб закреплён на `abe85d7503b0cb592102c8729dd321b7081f79c4` (PR #8/#9).
Архитектура/бизнес-API из #8, браузерный Auth/Profile из #9; Android/native остаётся в auth.yaml.

## Импорты

| Модуль | Для чего |
|---|---|
| `@zapas/api/auth-profile` | Новый Web: bootstrap, code/verify, refresh/logout, профиль, сессии |
| `@zapas/api/orchestrator` | Компании/счета, dashboard, операции/планы, forecast/backtest jobs и результаты |
| `@zapas/api/preprocessor` | Multipart CSV upload; ошибки/результат импорта читаются в Orchestrator |
| `@zapas/api/auth` | Совместимый прежний transport; основной для Android, временно для старых экранов Web |
| `@zapas/api` | queryClient, ApiError, browserHttp и обработчик потери сессии |

Методы и React Query hooks генерируются в разных namespaces; getMe/ErrorCode разных API не смешиваются.
Для прямых новых запросов использовать `browserHttp`; `http` оставлен старым экранам F1.
Внешний fetch — только внутри transport. Клиенты internal/Forecast/ledger/planning/notify и SSE удалены.
Входные path IDs — UUID согласно контракту; произвольный пользовательский текст не является ID ресурса.

## Подключение F1

1. Заменить handwritten auth DTO/queries в login-by-code и entities/session на auth-profile client. Новый code возвращает challengeId/абсолютные сроки, verify принимает challengeId и строку кода; demoCode отсутствует.
2. Профиль получать из Auth/Profile, компании/участников — отдельным запросом Orchestrator. Старый Me с вложенными companies не использовать. После verify одна browser session работает на бизнес-API через Gateway.
3. Новые generated hooks используют общий queryClient. Ошибка — ApiError с problem/status/code; field errors сохраняются для формы, 409 показывает конфликт, 429 учитывает Retry-After. Query retries отключаются для неопределённого refresh.
4. POST бизнес-команд принимает обязательный объект headers с Idempotency-Key; ключ создавать один раз на пользовательскую попытку и сохранять для повторного запроса. Для version-команд передать If-Match в кавычках. Повторный submit/сопоставление денег клиентом не заменяет серверную идемпотентность.
5. CSV upload получает Blob/file и accountId/validationMode/completeness. Content-Type не устанавливать: fetch создаёт multipart boundary. Для UNKNOWN не выдумывать полный период.
6. Для jobs использовать query refetchInterval 1/2/5 секунд по состоянию/числу запросов; остановить polling на SUCCEEDED/FAILED/CANCELLED и при уходе. SSE в v1 нет. nullable probability/metrics и STALE/error состояния не превращать в ноль или новый успешный прогноз.

Компоненты/страницы F1 и текущий mock login этим этапом не мигрированы. Backend/Gateway/SMTP runtime и доставка OTP проверяются в T-AUTH-01/T-INT-01. Наличие SDK не означает работающий сервер.

## Поведение браузерного transport

CSRF token/headerName берутся через GET `/api/v1/auth-profile/auth/csrf`, хранятся в памяти и подставляются на мутациях; cookies только credentials include. X-Client как переключатель режима не передаётся. Anonymous code/verify/refresh/logout не запускают access refresh при своих 401.

Параллельные защищённые 401 делят один refresh; запоздалый ответ старого поколения не ротирует второй раз. Повтор исходного запроса выполняется максимум один раз с теми же Idempotency-Key/If-Match. Только refresh 401 завершает сессию. Сетевой/503/неразбираемый ответ refresh блокирует автоматическую ротацию: сервер мог уже использовать refresh. После восстановления пользователь может явно повторить `refreshBrowserSession()` либо заново войти; UI должен показать неопределённое состояние, а не logout.

Verify/logout ждут уже отправленный refresh. Смена пользователя/выход очищают общий query cache; поздний ответ предыдущей identity отвергается. DELETE сессии сбрасывает CSRF binding для следующего bootstrap. Реальное удаление cookies и семейства refresh — обязанность backend по ADR-110.

## Проверки и обновление

```sh
node tools/hub/sync.mjs --ref <полный проверенный SHA хаба>
pnpm gen:api
node tools/check.mjs all
pnpm --filter @zapas/web e2e
```

Sync сначала проверяет локальные owned файлы, загружает и проверяет все hashes, затем обновляет snapshot и удаляет только retired файлы прежнего manifest. Локальные незавершённые изменения блокируют sync. Redocly config и events README также копируются с pinned SHA и проверяются по auxiliary hashes. При изменении только UI повторный sync не нужен.

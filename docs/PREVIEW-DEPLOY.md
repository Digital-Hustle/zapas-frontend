# Статический preview и CD — F2

Адреса: https://digital-hustle.ru/ и https://digital-hustle.ru/ui/; IP https://45.146.165.12/ также работает.
Это интерфейс и витрина компонентов. Backend подключён: `/api/*` проксируется в реальный
Gateway (Auth/Profile, Orchestrator, PreProcessor). Деморежим выключен: PREVIEW_MOCK_API=0,
deployment.mockApi=false, backend=true; экраны ходят в настоящий API. Обычная сборка моки
не включает. Cutover и откат — [PREVIEW-MOCKS](PREVIEW-MOCKS.md).
CD этого этапа не устанавливает приложения и БД.

## Автоматическая публикация

`.github/workflows/deploy-preview.yml` запускается после успешного `ci` на push
именно в `main` этого репозитория. PR, fork и другие ветки не получают deploy secret.
Перед сборкой и перед переключением проверяются актуальный SHA main и успешные
`frontend`, `summary`, `security` (включая gitleaks/Trivy). Старый SHA не публикуется.
GitHub concurrency сериализует публикации, активный deploy не прерывается.

Секрет `PREVIEW_SSH_KEY` настроен в GitHub Actions: существующий отдельный ed25519
ключ пользователя `zapas-deploy`. В репозитории только публичный host key
`.github/preview_known_hosts`, сверенный с ранее проверенным SSH known_hosts.
SSH использует strict host checking, batch mode и только этот ключ. `zapas-deploy`
не имеет sudo, не читает SMTP-секреты, не меняет Caddy/systemd и управляет статикой.

Сборка в чистом checkout Node 24/pnpm 10.34.7 создаёт `dist/preview/{web,ui}`.
Скрытые файлы, symlinks и неожиданные типы отклоняются; sourcemaps не упаковываются.
`web/deployment.json` содержит точный frontend SHA, preview=true, backend=true, mockApi=false.
Релиз загружается во временный уникальный каталог, затем становится неизменяемым:
`/opt/zapas/releases/<sha>`. `current` переключается атомарным rename symlink.

После переключения проверяются доверенный TLS, версия, `/login`, `/ui/`, `/healthz`,
security headers, cache policy, JS assets, закрытые `.env/.git/internal/actuator`,
отсутствие sourcemaps, CSRF bootstrap настоящего Gateway (200 JSON, cookie
`__Host-cashflow-csrf` с Secure/HttpOnly, `Cache-Control: no-store`) и 401
`application/problem+json` без сессии на защищённых маршрутах Orchestrator/Auth.
Ошибка возвращает предыдущий релиз и
оставляет deploy красным. Откат не перетирает чужое более позднее переключение.
Предыдущие releases и данные не удаляются.
Сетевой smoke использует системный curl с проверкой сертификата (без `-k`), как
исходный checker хаба; локально нужен curl, на GitHub Ubuntu runner он установлен.

## Повтор и ручная проверка

Первый реальный запуск CD после merge #16:
[Actions #40048405718](https://github.com/Digital-Hustle/zapas-frontend/actions/runs/40048405718)
успешно опубликовал `853556046b26f731b29c4ac619c1ead02fa0edb3`.
Публичный deployment.json подтвердил SHA. Последующие версии проверяются тем же
workflow; текущий SHA всегда брать из deployment.json.

Если новый main появился во время сборки, дождаться его CI/CD. Если текущий deploy
упал из-за временного сбоя, повторить workflow run после устранения причины.
Повтор использует тот же неизменяемый release; содержимое не перезаписывается.

```sh
PREVIEW_COMMIT=<полный-sha> node tools/deploy/smoke.mjs
```

Для авторизованной ручной публикации из чистого checkout проверенного main:

```sh
PREVIEW_COMMIT=<полный-sha> node tools/deploy/build-preview.mjs
PREVIEW_COMMIT=<полный-sha> PREVIEW_KEY_FILE=<локальный-ключ> \
  GH_TOKEN=<локальный-token> node tools/deploy/publish-preview.mjs
```

Секреты задавать через окружение/локальный secret manager, не сохранять команды с
их значениями в Git. Существующие SSH/Caddy/SMTP пути и root-операции описаны в
хабе `infra/preview/README.md`. Ключи, env и SMTP не входят в frontend bundle.

## Следующий backend handoff

Фактический backend по уточнению владельца — [hack-2026-back](https://github.com/Digital-Hustle/hack-2026-back).
Auth/Profile PR #1 имеет исходники, Compose и успешный verify; PreProcessor и
Orchestrator пока в draft-стеке. Gateway feature/gateway ещё несовместим с JWT/cookies/
CSRF согласованного ADR-110, а Auth/Profile не очищает legacy cookies.
Состояние и точные пути — [хаб BACKEND_RUNTIME_STATUS](https://github.com/Digital-Hustle/zapas/blob/main/docs/BACKEND_RUNTIME_STATUS.md).

На VPS Docker/backend пока отсутствуют. После совместимой сборки Gateway/Auth
и окончательных health/портов/миграций можно подготовить runtime, две БД,
ingress, backup/restore и rollback. Публикация статического main этого не заменяет.

SMTP TLS/login уже проверены предыдущим этапом; пароль в root-only серверном
файле. Отправка/доставка OTP и cookie-flow требуют реализации Auth/Gateway и
сквозного теста. Frontend не отправляет письма и не имитирует backend.

После подключения backend smoke проверяет реальные CSRF/401, но статический smoke
не подтверждает работу финансовых API. Полный сквозной вход/CSV/расчёт требует
отдельного интеграционного теста с валидной сессией.

## Откат

Автоматический: если smoke после переключения не проходит, publish возвращает
предыдущий release и оставляет deploy красным. Ручной возврат на демо: вернуть
`PREVIEW_MOCK_API: "1"` вместе с прежней версией smoke (проверка ожидаемого API 503)
и выпустить main; затем переключить `/opt/zapas/preview/current` на прежний SHA.
Не оставляй флаг `"1"` с новым smoke: он ожидает реальный Gateway и упадёт.

Основа workflow: [GitHub workflow_run](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run).
Секрет настроен через [libsodium sealed box](https://docs.github.com/en/rest/guides/encrypting-secrets-for-the-rest-api).

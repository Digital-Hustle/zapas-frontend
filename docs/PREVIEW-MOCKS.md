# Временный деморежим: удалить при готовности backend

> **Cutover выполнен 24.10.2026.** Backend подключён: `/api/*` проксируется в реальный
> Gateway (Auth/Profile, Orchestrator, PreProcessor), `PREVIEW_MOCK_API: "0"`,
> deployment `mockApi:false`, `backend:true`. Деморежим ниже выключен; текст сохранён
> как инструкция для отката и последующего удаления.

Владелец 24 октября разрешал моки на публичном frontend, пока Gateway/Auth/business
сервисы не были готовы. Это была демонстрация интерфейса, не готовый backend и не
проверка реальной доставки писем/финансовых расчётов.

## Как попробовать

- https://digital-hustle.ru/login — почта `demo@example.test`, код **000123**.
  Письма не отправляются. Введённая почта не сохраняется и не уходит в сеть.
- `/app`: seeded OWNER и VIEWER организации, RUB-счета, точные тестовые остатки;
  создание/редактирование/архивирование и ручной balance anchor.
- `/app/profile`: имя, собственные демонстрационные сессии, отзыв и выход.
- `/demo/forecast` и `/demo/jobs`: отдельные фиксированные примеры риска/качества
  и состояний задания. Они не рассчитываются по созданным организациям/остаткам.
- Баннер виден на всех страницах; «Сбросить демо» и обновление страницы удаляют
  состояние. Никакие данные/сессии/контакты не сохраняются в storage/cookies.

Не вводить настоящие финансовые/персональные данные. Неподдерживаемые API возвращают
ошибку, а не фиктивный успешный результат. CSV upload/history/report и операции/категории включены в текущий чекпоинт.
CSV возвращает подготовленный пример отчёта и две тестовые операции; строки
загруженного файла не разбираются. Поддержаны фильтры и одиночная/массовая
смена категории с версиями/key replay. Регулярности/планы/dashboard/settings
в этот чекпоинт не реализованы и не изображаются готовыми.

## Включение и границы

Единственный флаг публичной выкладки:
`.github/workflows/deploy-preview.yml` → `PREVIEW_MOCK_API`. Сейчас он равен `"0"`:
`build-preview.mjs` не выставляет `VITE_PREVIEW_MOCKS`, а deployment.json содержит
`mockApi: false`, `backend: true`. При `"1"` (только для отката) web-сборка получает
`VITE_PREVIEW_MOCKS=1`, а manifest — `mockApi: true`, `backend: false`.
Обычный `pnpm build` моки не включает. Локально:
`VITE_PREVIEW_MOCKS=1 pnpm --filter @zapas/web dev`.

`apps/web/src/app/preview/api.ts` перехватывает fetch до первого React render.
Настоящий SDK/CSRF/recovery, DTO mapper и экранные формы остаются в цепочке.
Только демонстрационные ответы; не создаются настоящие auth cookies/токены.
Любые `/api/*`, включая неизвестные/постороннего origin, не отправляются в backend.
Ассеты/не-API запросы проходят обычным fetch. Service worker отсутствует.

Модель поддерживает CSRF bootstrap, OTP deadline/ошибки, memory-only сессию,
pagination, UUID scope, VIEWER/archive guards, If-Match/409 и сохранение POST
payload/key при replay. Это проверка поведения интерфейса, не замена серверной
авторизации. До cutover на уровне Caddy настоящий `/api/*` отвечал 503; теперь он
проксируется в Gateway.

Отдельно от деморежима есть Prism-мок схем (`pnpm contracts:mock`): он не хранит
состояние и не изображает auth/CSRF/OTP — только примеры ответов контрактов для
вёрстки. Разница и ограничения — [CONTRACT-MOCKS](CONTRACT-MOCKS.md).

## Удаление / переход на настоящий API

1. Получить совместимые Gateway/Auth/Profile/Orchestrator/PreProcessor/Forecast,
   настроить закрытые сети/БД и ingress. Canonical Origin: `https://digital-hustle.ru`.
   Проверить условия `BACKEND_RUNTIME_STATUS.md` хаба и ADR-110.
2. **[выполнено]** Заменить Caddy API503 настоящим Gateway и проверить HTTPS/cookies/CSRF/OTP и
   реальные роли/Idempotency-Key/If-Match/CSV/расчёт.
3. **[выполнено]** Поменять **PREVIEW_MOCK_API на "0"** и выпустить новый чистый main через CD.
   Подтвердить `mockApi:false`, отсутствие демобаннера и настоящий network flow.
   Пользователю понадобится вход заново: демонстрационные данные не мигрируются.
4. Удалить `app/preview`, условные подключения в main/RootLayout/router/vite-env,
   dedicated demo browser check и эту инструкцию; убрать flag/metadata из build
   только после подтверждённого cutover. Финансовые DTO/контракты менять не надо.
5. **[выполнено]** Ожидаемый API503 удалён из smoke и заменён настоящими проверками:
   `GET /api/v1/auth-profile/auth/csrf` (200 JSON, 64-hex token, `X-CSRF-Token`,
   `__Host-cashflow-csrf` Secure/HttpOnly, `no-store`) и 401 `application/problem+json`
   без cookie на `/api/v1/orchestrator/companies` и `/api/v1/auth-profile/profile/me`.
   Проверки статики не менялись.

Проверки: preview API unit + `pnpm test:demo-browser` (production bundle), обычные
frontend/contracts/tooling/security и F1 browser suite. Normal bundle отдельно
проверяется на отсутствие demo API/fixtures, чтобы флаг действительно отключал моки.

Проверка демо после отката: `DEMO_PREVIEW_URL=https://digital-hustle.ru pnpm test:demo-browser`. Скрипт до любых действий требует deployment.mockApi=true/backend=false и видимый демобаннер; при PREVIEW_COMMIT сверяет SHA. К текущему релизу (mockApi=false/backend=true) он неприменим.

## Откат

Автоматический: при падении smoke publish возвращает предыдущий release. Ручной:
вернуть `PREVIEW_MOCK_API: "1"` и прежнюю версию smoke с ожидаемым API503, выпустить
main, затем переключить `/opt/zapas/preview/current` на прежний SHA. Флаг `"1"` с
новым smoke несовместим — он ожидает реальный Gateway.

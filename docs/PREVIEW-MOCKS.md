# Временный деморежим: удалить при готовности backend

Владелец 24 октября разрешил моки на публичном frontend, пока Gateway/Auth/business
сервисы не готовы. Это демонстрация интерфейса, не готовый backend и не проверка
реальной доставки писем/финансовых расчётов.

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
ошибку, а не фиктивный успешный результат. CSV и последующие экраны подключаются
отдельно по мере поставки F1.

## Включение и границы

Единственный флаг публичной выкладки:
`.github/workflows/deploy-preview.yml` → `PREVIEW_MOCK_API: "1"`.
`build-preview.mjs` явно передаёт `VITE_PREVIEW_MOCKS=1` только web-сборке и записывает
`mockApi: true`, `backend: false` в deployment.json. Обычный `pnpm build` моки
не включает. Локально: `VITE_PREVIEW_MOCKS=1 pnpm --filter @zapas/web dev`.

`apps/web/src/app/preview/api.ts` перехватывает fetch до первого React render.
Настоящий SDK/CSRF/recovery, DTO mapper и экранные формы остаются в цепочке.
Только демонстрационные ответы; не создаются настоящие auth cookies/токены.
Любые `/api/*`, включая неизвестные/постороннего origin, не отправляются в backend.
Ассеты/не-API запросы проходят обычным fetch. Service worker отсутствует.

Модель поддерживает CSRF bootstrap, OTP deadline/ошибки, memory-only сессию,
pagination, UUID scope, VIEWER/archive guards, If-Match/409 и сохранение POST
payload/key при replay. Это проверка поведения интерфейса, не замена серверной
авторизации. На уровне Caddy настоящий `/api/*` продолжает отвечать 503.

## Удаление / переход на настоящий API

1. Получить совместимые Gateway/Auth/Profile/Orchestrator/PreProcessor/Forecast,
   настроить закрытые сети/БД и ingress. Canonical Origin: `https://digital-hustle.ru`.
   Проверить условия `BACKEND_RUNTIME_STATUS.md` хаба и ADR-110.
2. Заменить Caddy API503 настоящим Gateway, проверить HTTPS/cookies/CSRF/OTP и
   реальные роли/Idempotency-Key/If-Match/CSV/расчёт на интеграционном окружении.
3. Поменять **PREVIEW_MOCK_API на "0"** и выпустить новый чистый main через CD.
   Подтвердить `mockApi:false`, отсутствие демобаннера и настоящий network flow.
   Пользователю понадобится вход заново: демонстрационные данные не мигрируются.
4. Удалить `app/preview`, условные подключения в main/RootLayout/router/vite-env,
   dedicated demo browser check и эту инструкцию; убрать flag/metadata из build
   только после подтверждённого cutover. Финансовые DTO/контракты менять не надо.
5. Удалить ожидаемый API503 из smoke только при готовом runtime и заменить
   настоящими health/auth/business проверками. Пока demo активен, 503 остаётся
   корректной проверкой границы статического сервера.

Проверки: preview API unit + `pnpm test:demo-browser` (production bundle), обычные
frontend/contracts/tooling/security и F1 browser suite. Normal bundle отдельно
проверяется на отсутствие demo API/fixtures, чтобы флаг действительно отключал моки.

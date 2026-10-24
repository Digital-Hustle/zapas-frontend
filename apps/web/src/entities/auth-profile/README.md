# Auth/Profile — доменный порт F1

Источник: hub abe85d7, AUTH_PROFILE_API / CLIENT_HANDOFF.
F1 реализует формы/состояния и доменную границу. F2 предоставляет общий HTTP,
CSRF/credentials/refresh и DTO нового namespace. После этой поставки F1 добавляет
DTO→mapper→AuthProfilePort и подключает provider в App. Сейчас этого адаптера нет:
production честно показывает недоступность, не обращается к legacy Auth.

## Граница адаптера

- `requestChallenge(email)` возвращает id, expiresAt/resendAt как абсолютный epoch ms,
  подготовленный из UTC response. Код или demoCode не передаются. Длина всегда 6.
- `verifyChallenge(id, code)` сохраняет ведущие нули; возвращает профиль и sessionId,
  без JWT/refresh. Успех отменяет старые queries, очищает приватный кэш и записывает
  новый профиль. Организации не берутся из Auth.
- profile: id/email/displayName/version. Nullable displayName не превращается в name,
  version только возвращается серверу, не инкрементируется клиентом.
- sessions: id/createdAt/lastSeenAt/expiresAt/current, без выдуманных IP/устройств.
  Текущую/все сессии и logout отличать от отзыва другой сессии.
- Сопоставлять известные machine codes в `AuthProblem`: code-invalid, code-expired,
  code-attempts-exceeded, rate-limit (retryAt абсолютный), profile-conflict,
  session-expired только после окончательного 401, session-not-found, validation,
  offline/unavailable. Unknown игнорирует технический текст и поля ошибки.
- Bootstrap CSRF, HttpOnly/credentials include и refresh single-flight без сетевого
  auto retry остаются обязанностью общего транспорта; F1 не добавляет fetch или
  альтернативные cookies. После logout транспорт делает новый bootstrap.

## Реализованная UI-часть

RHF/zod email/OTP/profile; challengeId/абсолютные сроки, запрет повторной команды,
истёкший/исчерпанный challenge требует нового. Нет подстановки OTP. Профиль при 409
перечитывается отдельным Query, черновик сохраняется. Пользователь выбирает имя,
затем явно подтверждает новое сохранение. Нет слепого retry PUT.

Read-only email, nullable имя, общий pending для Auth-мутаций, persistent errors,
notify и сессии с UI-kit confirm. Успешный выход/отзыв текущей/всех очищает queries;
outage сохраняет профиль и черновик. Guard отличает missing adapter/pending/outage
от подтверждённой потери сессии. Endless skeleton и старый Auth.me удалены.

## Проверка

`pnpm dev`, `/dev/auth-profile/login` — отдельный QueryClient и локальный порт,
явная метка примера. Обычный режим принимает любые шесть цифр только для проверки
UI; OTP не выдаётся, email не отправляется, API не вызывается. Витрина исключена
из исполняемой production сборки. Это не проверка Gateway/CSRF/SMTP/JWT.

Доказательства — apps/web/evidence/T-CLIENT-01-auth-profile. Общий danger hover
F2 имеет подтверждённый дефект контраста; F1 использует существующие default
confirm и secondary button, без изменения shared UI/токенов.

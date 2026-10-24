# T-CLIENT-01 Auth/Profile evidence

Base: frontend main 8535560 (F2 API v1, полный UI-kit и preview CD).
Hub: abe85d7503b0cb592102c8729dd321b7081f79c4.

- 22 свежих PNG: вход, код и профиль на 360/768/1440 px в обеих темах;
  подтверждение отзыва на 360/1440 px в обеих темах.
- Все 40 Playwright: пройдены. Auth/Profile — 21, прежние landing/risk/jobs — 19.
  Проверены reduced motion и обычная анимация, клавиатура, отсутствие overflow,
  axe без serious/critical, двойной submit, сроки/лимиты OTP, profile 409,
  сохранение черновика при outage и явный recovery после неопределённого refresh.
- 6 Auth HTTP-тестов используют настоящий shared SDK с перехваченным HTTP:
  CSRF/verify/version/sessions/logout, ошибка выхода, окончательный refresh 401,
  остановка повторной ротации и запросов уходящей страницы после выхода.
- node tools/check.mjs frontend contracts tooling security: пройдено;
  112 Vitest (tokens 4 + UI 49 + API 16 + charts 6 + web 37), 22 tooling.
  Локальный gitleaks отсутствует; GitHub security (Gitleaks/Trivy) проверяется отдельно.
- Production .js не содержит dev Auth fixtures. На картинках явно помечен локальный
  пример с отдельным портом/QueryClient: OTP/письма/настоящие данные не используются.

Контрактные HTTP fixtures и визуальная витрина не подтверждают готовность реального
Auth/Gateway/SMTP. Бизнес-данные Orchestrator подключаются следующей частью F1.

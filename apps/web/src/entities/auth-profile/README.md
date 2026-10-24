# Auth/Profile — доменный порт F1

Wire source: hub abe85d7, AUTH_PROFILE_API.md / auth-profile.yaml.
F1 реализует формы и состояния по доменным моделям; адаптер общего транспорта
CSRF/credentials/refresh принадлежит F2 и подключается через provider.
Самостоятельный fetch или переход на legacy Auth не допускается.

План этой части:
- challengeId, абсолютные expiresAt/resendAvailableAt; шесть ASCII цифр строкой;
- profile displayName/version, сохранение черновика при 409 и явное согласование;
- sessions, current/all revoke, logout;
- session guard отличает окончательный 401 от outage и отсутствия адаптера;
- production без адаптера показывает недоступность, не использует старые /auth
  вызовы, demoCode, companies из профиля или бесконечные skeleton.

OTP никогда не подставляется из ответа. Компания/счёт выбираются в Orchestrator
отдельно от профиля. Токены не передаются через этот порт и не хранятся в JS.

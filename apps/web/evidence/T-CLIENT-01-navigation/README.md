# T-CLIENT-01: страница бизнеса и возврат

6 PNG: 360/768/1440 × light/dark, reduced motion и клавиатурный фокус возврата.

Компания открывается на /app/company/:companyId; выбранный счёт хранится в URL.
Старый /app?company=…&account=… перенаправляется с replace. Импорт/операции
сохраняют scope и возвращаются к бизнесу. Company всегда перепроверяется при
открытии: новый 403 скрывает также кешированное имя в заголовке.

Проверки: root frontend/contracts/tooling/security, 148 Vitest +34 tooling.
Новый маршрут + CSV + workspace: 58 Playwright passed после исправления
ожидаемого URL CSV; payments/theme: 29 passed в общем прогоне. 6 axe0 матриц,
перезагрузка/direct URL, старые ссылки, возврат/смена компании/отмена запросов,
403 cache hiding. Серверные сервисы не проверяются HTTP fixtures.

В навигации только существующие imports/payments; остальные добавляются
следующими самостоятельными PR.

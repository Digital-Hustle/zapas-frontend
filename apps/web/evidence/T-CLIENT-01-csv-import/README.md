# CSV — текущий draft, зависит от FileDrop F2

Основа: frontend main d166795, управление #20 (проверен интеграционный cc5dcaa),
спецификация hub cf8ac5a; API manifest закреплён на abe85d7, контракты не менялись.

- 12 PNG: upload/report на 360/768/1440 × light/dark. Визуально проверены desktop
  dark и mobile light. Примеры в HTTP fixtures, реальный SDK/browser transport.
- node tools/check.mjs frontend contracts tooling security: passed, 135 Vitest
  (tokens4/UI57/API16/charts6/web52), 22 tooling, lint/types/FSD/tokens/contracts/
  production build/guard. Локальный gitleaks отсутствует, security CI отдельно.
- Прежние70 Playwright прошли в общем прогоне. После исправления двух проверок
  отчёта отдельно CSV: 14 passed, 6 failed. Все шесть matrix сценариев доходят до
  upload/report/counts/scope/keyboard/overflow assertions и падают на финальном axe.
  Это не зелёный полный E2E и не статус review/done.
- Functional: multipart сохраняет filename/bytes/account/режим/полноту, UNKNOWN
  не отправляет declared dates; полный период и SKIP_INVALID выбираются явно.
  Lost response +429 сохраняют File/body/key; 422 с resourceId открывает report,
  без resourceId остаётся форма и исправление создаёт новый key. STAGING не
  выдаётся за success; новый автоматический POST не запускается.
- Scope/права: report другой компании/счёта отвергается до issues; viewer/archive
  только чтение; pagination10/20, outage cached data и404 hide; HTML в issue.message
  отображается текстом; malformed URL не вызывает business API. Uncertain upload
  блокирует навигацию до явного выбора.

## Неисправленный shared defect

Axe 4.14: serious label-content-name-mismatch, WCAG 2.5.3, FileDrop.tsx:79/96.
role=button содержит aria-label="Выбрать выписку CSV", видимый текст также включает
«Перетащите файл или нажмите Enter для выбора». Все шесть widths/themes дают эту
ошибку на upload/report. Она не исключена из тестов. Владелец — F2; packages/ui
не изменён F1. После исправления нужно повторить CSV matrix/full Playwright и
обновить evidence, затем переводить PR в review. До этого поставка — draft.

Runtime PreProcessor/Gateway/Orchestrator не подтверждён. Следующая независимая
часть F1 — операции/категории, затем регулярности/планы/dashboard/quality/settings.

# События

Сгенерировано `node tools/contracts/gen-events.mjs` из `events.json`. Не редактировать вручную.

Конверт — `envelope.schema.json`. Стрим: `zapas.{type}.v{version}`.

| Событие | Производитель | Потребители | Обязательные поля |
|---|---|---|---|
| `auth.mail-command.v1` | auth | notify | deliveryId, expiresAt, client |
| `auth.company-created.v1` | auth | planning, forecast | companyId, taxRegime, hasEmployees, minBalance |
| `auth.company-updated.v1` | auth | planning, forecast | companyId, changed, snapshot |
| `auth.company-deleted.v1` | auth | ledger, planning, forecast, notify | companyId |
| `auth.member-invited.v1` | auth | notify | companyId, email, role, companyName, inviterName |
| `ledger.transactions-imported.v1` | ledger | forecast, planning | companyId, importId, fromDate, toDate, rowsImported, appendOnly |
| `ledger.categories-changed.v1` | ledger | forecast, planning | companyId, affectedCount |
| `ledger.recurring-changed.v1` | ledger | forecast, planning | companyId, patternIds |
| `planning.events-changed.v1` | planning | forecast | companyId, sources, fromDate |
| `planning.expected-payment-overdue.v1` | planning | forecast, notify | companyId, eventId, title, amount, plannedDate, overdueDays |
| `forecast.forecast-updated.v1` | forecast | notify | companyId, runId, level |
| `forecast.alert-raised.v1` | forecast | notify | companyId, alertId, kind, severity, title, actionUrl |

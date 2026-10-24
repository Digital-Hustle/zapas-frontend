# CSV: PreProcessor upload, Orchestrator history/report

`@zapas/api/preprocessor` принимает multipart, Orchestrator хранит историю/отчёт.
DTO → проверка/mapper → доменные StatementImport/StatementIssue → TanStack Query.
React не читает wire DTO. Company/account UUID берутся из выбранного scope,
ответы сверяются с обоими; перед issues проверяется detail отчёта. Серверная
пагинация: 10 импортов и 20 замечаний. Query keys включают company/account/import/page.

Форма RHF/zod, FileDrop/RadioGroup/Checkbox/DateRangePicker из UI-kit. Файл не
разбирается клиентом: размер/расширение только предварительные проверки, 20 МиБ и
50 000 строк — лимиты контракта, содержимое проверяет сервер. Полнота UNKNOWN по
умолчанию; declared dates отсутствуют в multipart до явного подтверждения полного
периода. ATOMIC по умолчанию, SKIP_INVALID выбирается отдельно; это не подтверждение
полноты. Даты — строки календаря. Суммы, EOD и финансовые итоги не вычисляются.

POST: один UUID и исходный File/параметры на явную попытку. Потеря ответа и
последующий429 сохраняют исходную команду; поля заблокированы до разрешения исхода.
Повтор ручной, Retry-After соблюдается. Неожиданный RECEIVING/STAGING/unknown в
ответе upload не выдаётся за завершение и сохраняет попытку. При 422 optional
resourceId проверяется как UUID и открывается отчёт через Orchestrator; новый
файл/исправление после известного отказа — новый ключ. Shared transport сохраняет
Problem extensions, resourceId сужается zod без изменения F2-типов.

Нет фиктивного процента обработки. Неподтверждённая отправка блокирует внутреннюю
навигацию до явного выбора «Остаться»/«Перейти и проверить историю». Файлы и
параметры хранятся только в памяти. Отчёт показывает серверные counts, неизвестный
status/severity безопасно подписываются; message отображается как текст React,
не HTML. Ошибки операций статические, raw detail и CSV не логируются.

403/404 скрывают прежний приватный ресурс, outage сохраняет доступный кэш с
пометкой. Архив/VIEWER — только чтение; WRITE и canImport проверяются независимо
от профиля Auth, сервер повторяет проверку. Logout останавливает private Query и
очищает кэш. SDK сохраняет общий CSRF/HttpOnly/single-flight refresh; ручной recovery
не отправляет upload автоматически.

Известная зависимость F2: FileDrop.tsx:79/96 (main d166795) задаёт aria-label только
по label, но добавляет видимую подсказку внутри role=button. Axe 4.14 сообщает
serious label-content-name-mismatch на 360/768/1440 × обе темы. F1 не меняет
packages/ui и не отключает это правило. CSV остаётся draft до исправления F2.
HTTP fixtures проверяют клиент, не настоящий PreProcessor/Gateway/Orchestrator.

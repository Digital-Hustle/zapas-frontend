# Организации и счета: управление

Основа: company/create PR #18@2c5e45e, Auth/Profile #12@6e7620f,
F2 #17/main 0d2b024; контракт hub abe85d7 (документы продолжения 760917f).

- 18 PNG: редактирование организации, ввод остатка, архив счёта;
  360/768/1440 px × light/dark. Скриншоты — HTTP fixtures с настоящим SDK.
- Все70 Playwright прошли: прежние54 +16 управления. Фокус/Enter, reduced и normal
  motion, axe без serious/critical, отсутствие горизонтального overflow.
- Полные nullable PUT и If-Match, конфликт версии с сохранением черновика,
  раздельные выбор актуальной версии и сохранение, outage при перечитывании,
  потеря ответа PUT без автоматической повторной записи.
- Archive: OWNER, подтверждение, If-Match + Idempotency-Key, replay с прежней
  версией/ключом; 409 требует перечитывания/явного принятия и новой команды.
  Архив сохраняет историю и блокирует дальнейшую запись.
- Anchor: DatePicker/MoneyInput/основание; missing/future date отклоняются,
  положительный/нулевой/отрицательный остаток, точное -99999999999999999.99;
  lost response повторяет прежний payload/key. Старый anchor не подменяет latest
  balance: счёт перечитывается, финансовых вычислений в клиенте нет.
- VIEWER/ACCOUNTANT/OWNER, archive и серверный403: права перечитываются,
  дальнейшая запись скрывается. Query keys содержат company/account.
- node tools/check.mjs frontend contracts tooling security: passed, 130 Vitest
  (tokens4 + UI57 + API16 + charts6 + web47), 22 tooling, lint/types/FSD/build/
  tokens/contracts/guard. Локальный gitleaks не установлен; security CI отдельно.

Gateway/Orchestrator runtime и полное завершение F1 этими тестами не подтверждены.
Следующая часть — CSV PreProcessor + история импорта/отчёт Orchestrator.

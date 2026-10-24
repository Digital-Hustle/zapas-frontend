---
name: contracts-first
description: Согласование DTO/API между командами без обязательного отдельного contract-first процесса.
---

# HTTP API handoff

Актуальные HTTP DTO — contracts/openapi и docs/orchestrator. Обновлять описание и примеры вместе с согласованным изменением; отдельный PR только под contracts и codegen не обязательны. Брокера и событийных схем нет. Не править продуктовые копии без обновления hub ref/manifest; см. docs/REPOS.md.

Объединённый Auth handoff ADR-110: docs/AUTH_PROFILE_API.md, docs/GATEWAY_AUTH.md и docs/CLIENT_HANDOFF.md. Основной browser contract auth-profile.yaml; Android/native и legacy — auth.yaml. Общие userId/sid, JWT только на Gateway, бизнес-компании/роли только Orchestrator. Namespaces API раздельные; при cookie-мутациях CSRF/Origin. Выбор transport без fallback и очистка browser cookies согласованы в handoff; реализация проверяется отдельно.

---
name: security-fintech
description: Финансовая безопасность «Запас» — auth/OTP, tenant IDOR, токены/CSRF, импорт/экспорт, AI/SSRF, логи/секреты, supply chain и audit. Используй для security ревью и перед PR в критическую зону.
---

# Security review

Основной источник — docs/SECURITY.md. Скилл не обещает «невзламываемость»; находки записываются с reproduction/impact и тестом. Документация о контроле не равна его реализации.

1. Определить assets/trust boundaries: company/account/role/session/OTP/invoice/forecast/raw import/provider secret.
2. Матрица endpoint×role×tenant: аноним, свой owner/accountant/viewer, чужой user, admin без финансовых прав, service identity без user прав. Deny by default; отсутствие endpoint/role/provenance — blocker.
3. JWT подпись/iss/aud/exp/kid, алгоритм allowlist; no headers identity. Host-only HttpOnly cookies и CSRF/Origin, mobile Bearer release TLS.
4. OTP real code любому валидному email, одинаковые ответы независимо от existence; rate key HMAC(email), limits distributed+atomic, failed attempts persist, absolute expiry, replay/success race тесты. Email OTP — не MFA, почтовый аккаунт остаётся фактором риска.
5. Refresh atomic consume/reuse revocation с полными session families; concurrent refresh clients serialized. Если добавлен grace, он только для привязанной идемпотентной request, не общий replay.
6. Money boundaries Decimal/constraints, immutable actual ledger; сценарий не меняет факт, модель/LLM не разрешает платёж или налоговое решение.
7. Import limits, duplicate semantics, ZIP/formula injection, filename/path traversal, no fetch URLs из импортированных текстов. CSV escape с отрицательными числами правильного numeric type.
8. AI: explicit egress allowlist, least data, vendor retention/terms, prompt injection treated untrusted, output schema+enum validation, probabilities measured not assumed. Admin URL нельзя произвольно ходить в metadata/внутрсеть.
9. Logs/body traces исключают токены/OTP/ИНН/финансы; audit append-only с actor и reason, без generic DTO serialization. Secrets env/keystore/AEAD rotation, no defaults/backdoor.
10. Реальные scans + licensed dependency/version + tests. Finding table P0/P1/P2, affected path, repro, fix, regression test; false positive allowlist narrow reason/date/reviewer.

Сторонние differential-review/supply-chain-risk-auditor — только по необходимости; их scripts сначала читать. Не запускать installer/скрипт с боевыми секретами.

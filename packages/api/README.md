# @zapas/api

Public clients from pinned hub v1: `auth-profile`, `orchestrator`, `preprocessor`; `auth` is the separate legacy/native namespace. Generated files are rebuilt with `pnpm gen:api`, never edited manually.

Client integration, transport rules, command headers and verification: [F2 API handoff](../../docs/F2-API-V1.md). Query/mutation errors are `ApiError`; money remains strings and nullable estimates remain nullable. The SDK does not implement the backend.

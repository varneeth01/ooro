# DeviceOS Applications HTTP 500 investigation

## Finding

A disposable PostgreSQL 16 instance with all committed migrations reproduced the authorized applications-list failure. The Prisma query failed with `P2022`: column `ManagedApplication.critical` does not exist. The Prisma model expects both `critical` and `remoteUninstallAllowed`, but the committed schema history did not create those columns. This is a schema migration gap, not a browser-extension messaging error.

The fix adds an additive migration with safe defaults for existing rows. The Next.js proxy also now preserves valid backend responses and correlation IDs, and maps transport or malformed-upstream responses to a sanitized 502 rather than an unhelpful Next.js 500. The Applications page displays an explicit empty state when the backend returns an empty list.

## Validation

- Before migration: authorized route on disposable DB returned HTTP 500 / Prisma `P2022`, missing `ManagedApplication.critical`; see `deviceos-applications-schema-repro.log`.
- After migration: Main API integration test verified anonymous 401, DRIVER 403, SUPER_ADMIN 200 with `data: []`; see `deviceos-applications-after-migration.log`.
- After migration: standalone DeviceOS API integration test verified the same authorization and empty-list results; see `deviceos-service-applications-after-migration.log`.
- Proxy response tests cover successful empty lists, forwarding 401/403/500 and request IDs, malformed responses, and transport errors; see `deviceos-proxy-response.test.log`.
- Main API test suite: 104 passed, 7 skipped; `deviceos-applications-main-api-tests.log`.
- DeviceOS API test suite: 4 passed, 1 skipped; `deviceos-applications-service-tests.log`.
- Typecheck, lint, root build, and DeviceOS API build logs: `deviceos-applications-typecheck.log`, `deviceos-applications-lint-final.log`, `deviceos-applications-build-final.log`, and `deviceos-applications-agent-build-final.log`.
- `git diff --check` passed. Disposable PostgreSQL container was stopped.

## Staging status

An unauthenticated request to staging returned HTTP 401 with request ID `req-10c`; response headers/body are in `deviceos-applications-staging-unauth.headers` and `deviceos-applications-staging-unauth.json`. No authorized staging admin session was available, so the reported authorized staging 500, deployed migration state, server exception, and post-deployment response could not be independently inspected. No staging or production configuration/data was changed.

**Status: locally fixed and tested; staging resolution BLOCKED pending migration deployment and authorized Super Admin verification that the endpoint returns HTTP 200 (including an empty list).**

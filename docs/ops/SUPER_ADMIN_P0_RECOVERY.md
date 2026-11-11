# OORO Super Admin P0 — production recovery (11 November 2026)

Incident: https://github.com/varneeth01/ooro/issues/77

## Scope and evidence
- Campaign list `GET /api/admin/campaigns`: web Next.js route returns 503 after a failed Prisma query.
- Proof of Play `GET /api/admin/proof-of-play?skip=0`: backend returns 500.
- Layout Studio `GET /api/admin/layout-studio`: backend returns 500.
- CSP warning messages are **report-only** and not evidence that requests are blocked.
- These results are **not evidence of missing migrations by themselves**. Verify exact errors first.

## Run from Coolify application terminal (no Docker required)

After deploying the diagnostics build to a non-production stage, open the **terminal inside each Coolify application**, run:

```sh
pwd
node -v
node scripts/diagnose-super-admin.mjs
```

In the **web** container check database_connection and campaign_list_query.
In the **API** container check proof_of_play_list_query, proof_of_play_count and layout_studio_query.
The script does not modify data, print database URLs, enumerate records or run migrations. It prints only PASS/FAIL, safe Prisma error codes and migration counts. A failing check sets exit code 1. Do not copy environment secrets into screenshots.

**Existing production container without this PR:** the diagnostic script will not yet exist. Instead use Coolify's Logs tab in the web/API apps and match the request IDs. Do not assume `docker` is available in the application shell; Docker commands require the VPS host.

## Interpreting results

| Category | Likely next check |
|---|---|
| database_unreachable / P1001 or P1002 | DB networking, DB service, runtime DATABASE_URL scope and target, TLS |
| prisma_initialization_failed | Prisma native engine/platform and runtime configuration |
| missing_table_or_unapplied_migration / P2021 | Compare migration history in **the correct database**; inspect pending migrations |
| missing_column_or_schema_drift / P2022 | Compare generated client and applied migration/column schema |
| generated_prisma_client_mismatch | Check `prisma generate` during the image build and schema version |
| sql_query_failed / P2010 | Review private server SQL logs and migration history |
| migration table missing | Investigate Prisma migration baseline, do not reset or guess |

## Remediation gate

1. Record deployed Git SHA/image ID for **web** and **API**; make sure both services point to the intended PostgreSQL database.
2. Capture and redact server-side exceptions for the exact failing requests (including `req-3l` if present). Do not expose DB URLs, credentials, JWTs or user records.
3. Run `pnpm --filter @ooro/api exec prisma migrate status` **read-only** with the correct production DB configuration, only after confirming Prisma CLI is installed.
4. If migrations are pending, review every migration and its data safety on a disposable copy of the production schema; obtain operator approval before `migrate deploy`. **Never** run `migrate reset`, `db push --force-reset` or an unconditional migration on production.
5. If tables and columns exist, inspect actual Prisma initialization errors, the web container's DATABASE_URL, service-to-service URL, and role permissions.
6. Repair on a focused branch or Coolify configuration, test against an equivalent staging environment, then deploy with rollback.
7. Verify role enforcement: unauthenticated returns 401; wrong roles 403. Super Admin reads campaigns, proof of play and layouts successfully. An actual empty dataset should render an empty state, not a synthetic success response.

## UI and operational follow-up

Once the P0 queries work, do a systematic admin smoke test of campaign create/approve/schedule (in staging), creative image/video upload, screens, playback proofs, layouts, devices, drivers and error handling. Prefer non-destructive read checks on production. Address CSP report-only warnings separately with a measured policy that does not weaken security.

## Acceptance status
**NOT RESOLVED** until the live endpoints return non-5xx to authorized Super Admin users. No production changes should be inferred from merely merging the diagnostics PR.

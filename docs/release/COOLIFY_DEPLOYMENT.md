# Coolify Deployment

These steps are for staging first. They do not authorize a production deploy.

## API service

- Repository: `varneeth01/ooro`
- Branch: deploy a reviewed `main` commit after its PR is merged
- Build pack: Nixpacks
- Base directory: repository root
- Build configuration: checked-in `nixpacks.toml`
- Node: 22
- Build dependencies: Python 3, GCC, GNUMake and `pkg-config`; these are build-time packages for native Argon2 and are not secrets.
- Install command: `pnpm install --frozen-lockfile --prod=false`
- Build command: `pnpm --filter @ooro/api exec prisma generate && pnpm --filter @ooro/api build`
- Start command: `pnpm --filter @ooro/api start`
- Port: `8080` (or Coolify's injected `PORT` if the service wrapper uses it)

The checked-in `Dockerfile.api` is an equivalent Node 22 fallback for a Docker-based service. Do not pass runtime secrets as Docker `ARG`, build arguments, labels, or files copied into an image.

## Runtime variables

Set these in Coolify's runtime environment/secrets, not in the build environment:

`NODE_ENV=production`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `ADMIN_WEB_BASE_URL`, `EMAIL_FROM`, `EMAIL_PROVIDER_API_KEY`, `DEVICEOS_STORAGE_MODE=s3`, `DEVICEOS_S3_BUCKET`, `DEVICEOS_S3_REGION`, `DEVICEOS_S3_ENDPOINT`, `DEVICEOS_S3_ACCESS_KEY_ID`, `DEVICEOS_S3_SECRET_ACCESS_KEY`, `DEVICEOS_DOWNLOAD_BASE_URL`, and the documented TTL/rate-limit settings. No payment-provider credentials are required; historical MongoDB storage is optional.

Use the exact names in `apps/api/.env.example`. Do not copy its development values into staging or production. `DEV_MOCK_OTP_ENABLED` must be explicitly `false` in production. Do not run bootstrap or password-setup commands until the migration and operator approval are complete.

## Staging sequence

1. Create a staging-only database backup/snapshot and verify restore ownership.
2. Configure Coolify runtime secrets and HTTPS domains for API and web.
3. Deploy the reviewed API commit with health checks on `/health` and `/api/health/db`.
4. Run `prisma migrate deploy` only against the intended staging `DATABASE_URL` from a controlled release job.
5. Complete admin setup/reset, role-boundary, driver, display, DeviceOS and email smoke tests. Payment processing is retired and is not a launch dependency.
6. Verify logs contain request IDs but no passwords, tokens, authorization headers or secret URLs.
7. Promote the same immutable image/commit only after the staging checklist passes.

## Automated smoke test

From a checked-out reviewed commit, run the credential-free checks:

```bash
BASE_URL=https://staging.theooro.com \
API_URL=https://api-staging.theooro.com \
scripts/release/staging-smoke.sh
```

For the approved operator workflow, provide `ADMIN_EMAIL` and `ADMIN_PASSWORD` only through the protected shell environment. Add `SMOKE_REQUIRE_ADMIN=true` so missing credentials fail the run. The script never prints credentials or bearer tokens. Password-reset token consumption and email delivery still require a controlled mailbox test because issuing a reset email alone cannot prove token use or expiry.


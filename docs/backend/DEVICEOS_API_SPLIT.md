# OORO API split: staging rollout and rollback

This change introduces `apps/deviceos-api` as an independently buildable service while keeping the existing DeviceOS routes in the Main API during the compatibility window. The Android client contract is unchanged: DeviceOS paths, request authentication, response envelopes, and PostgreSQL records remain compatible.

## Ownership

| Service | Staging hostname | Owns | Required runtime configuration |
|---|---|---|---|
| Main API | `api-staging.theooro.com` | Admin email/password auth, advertising, campaigns, finance, reporting, driver operations, customer APIs | PostgreSQL, JWT, email provider, payment and existing business integrations |
| DeviceOS API | `deviceos-staging.theooro.com` | DeviceOS enrollment, heartbeat, identity, inventory, catalogs, APK releases, deployments, commands and telemetry | PostgreSQL, JWT, private R2/S3 credentials, APK inspection tools |

Both services use the existing PostgreSQL schema initially. The Main API remains the sole Prisma migration owner. The DeviceOS API runs `prisma generate` against `apps/api/prisma/schema.prisma` and must never run `prisma migrate deploy` or create a second schema.

## Cross-service authorization

DeviceOS administrative endpoints continue to validate the existing signed access token with the shared `JWT_SECRET`, load the current user from PostgreSQL, and enforce `SUPER_ADMIN`, `ADMIN`, and `OPERATIONS` through the existing role guards. The DeviceOS service has no account creation, password setup, password reset, or independent admin-login routes. A future dashboard-to-DeviceOS integration may use a short-lived service token, but must retain an explicit role/scope mapping and audit actor identity.

## Local validation

```bash
pnpm install --frozen-lockfile
pnpm --filter @ooro/api build
pnpm --filter @ooro/deviceos-api build
pnpm --filter @ooro/api test
pnpm --filter @ooro/deviceos-api test
```

The Main API startup test imports production configuration without DeviceOS S3 variables. The DeviceOS API startup test imports production configuration without email credentials. Integration tests must set `DATABASE_URL` to a disposable PostgreSQL instance.

## Coolify application configuration

Create two applications from the same repository and pin each to the reviewed commit. Do not put secrets in build arguments, Docker `ENV`, Git, or image layers.

### Main API

- Dockerfile: `Dockerfile.api`
- Start command: `pnpm --filter @ooro/api start`
- Port: `8080`
- Hostname: `api-staging.theooro.com`
- Environment: `apps/api/.env.example` as the non-secret baseline.
- Do not configure DeviceOS R2 credentials. DeviceOS routes remain enabled only for the staged compatibility period.

### DeviceOS API

- Dockerfile: `apps/deviceos-api/Dockerfile`
- Start command: `pnpm --filter @ooro/deviceos-api start`
- Port: `8081`
- Hostname: `deviceos-staging.theooro.com`
- Environment: `apps/deviceos-api/.env.example`.
- Configure a private Cloudflare R2 bucket and scoped access key at runtime only. Permit the API to read/write only the staging bucket/prefix.

The DeviceOS container includes native build dependencies in its build stage for Argon2 and runtime libraries in its runtime stage. This avoids the prior Nixpacks native Argon2 failure; if Nixpacks is retained, install equivalent `python3`, `make`, `g++`, `pkg-config`, and OpenSSL development packages before dependency installation.

## Staged cutover

1. Deploy DeviceOS API to `deviceos-staging.theooro.com` with the same database, JWT secret, and private staging R2 bucket.
2. Verify `/health`, `/api/health/db`, enrollment, heartbeat, state polling, APK upload/download, admin role enforcement, and Android API compatibility using a disposable device/test target.
3. Update the admin dashboard DeviceOS base URL to the DeviceOS hostname and verify all catalog, release, deployment, telemetry, and audit calls.
4. Confirm Android Agent configuration uses the DeviceOS hostname, then observe heartbeat and desired-state polling without reinstalling or resetting identities.
5. After a monitored acceptance window, disable DeviceOS route registration in the Main API in a follow-up reviewed change. Keep the old Main API deployment available for rollback.

## Rollback

If DeviceOS API health or Android compatibility regresses, point the dashboard and Agent configuration back to the Main API DeviceOS routes, or restore the prior Main API deployment. Do not migrate or delete data. Keep the shared PostgreSQL schema and R2 objects unchanged. Revoke only the DeviceOS staging R2 key if it is compromised; never reuse production credentials.

## Production gates not covered by this split

This repository change does not deploy either service, provision Device Owner, change DNS, access production PostgreSQL/R2, or validate unattended installation and kiosk playback. Those remain separate acceptance gates.

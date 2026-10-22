# Rollback Plan

## Application rollback

1. Stop promotion and record the failing commit, image digest and migration state.
2. In Coolify, redeploy the last known-good immutable API/web commit or image. Do not rebuild from a moving branch.
3. Keep the database running unless the release owner confirms compatibility; additive migrations should remain applied when the previous binary can safely ignore the new nullable fields.
4. Re-run `/health`, `/api/health/db`, admin login/logout, driver login, display heartbeat and payment webhook signature checks.

## Database rollback

Do not reverse a migration by editing `_prisma_migrations` or running an unreviewed down script. For destructive or incompatible changes, restore a verified backup to a separate database, validate it, and perform a planned data migration. The admin password migration is additive; preserve password hashes and token/session revocation state.

## Android rollback

Pause the DeviceOS campaign, stop assigning new targets, and retain the last known-good release. Do not uninstall, factory-reset, or silently downgrade devices. Use the agent's reported health and certificate checks to quarantine failed cohorts. Verify app data and credentials before any upgrade or rollback.

## Recovery evidence

Record the exact deploy/image SHA, database migration list, backup restore point, operator, start/end times, health responses, affected cohort and customer impact. Never put secrets or bearer tokens in the incident record.


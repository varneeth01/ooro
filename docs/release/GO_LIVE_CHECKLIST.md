# OORO Go-Live Checklist

Statuses are based on the 2026-10-22 repository audit. `PASS` means locally evidenced; `BLOCKED` means a release prerequisite remains; `NOT TESTED` means no evidence was collected.

## Blocker

- [PASS] PR #2 Argon2/Nixpacks fix merged at `66028a0cce606b460f41304eca7e649de9e3e48a`.
- [PASS] Node 22 API build, Prisma validation, TypeScript and lint completed; lint has 0 errors and 20 warnings.
- [PASS] Disposable PostgreSQL 16 database accepted all 34 checked-in migrations.
- [PASS] PostgreSQL-backed API test run: 91 total, 88 passed, 0 failed, 3 skipped.
- [BLOCKED] Coolify staging deployment and smoke tests have not been run.
- [BLOCKED] Production email, database, R2, payment, HTTPS, backup and monitoring configuration is not verified.
- [BLOCKED] DeviceOS service separation is not present on `main`.
- [BLOCKED] Android SDK/signing keys/physical devices were unavailable; no production APK/AAB was produced.

## Required before website launch

- [PASS] Next.js production build completed locally.
- [PASS] Admin login uses email/password UI and server-enforced admin roles.
- [PASS] Local admin login, generic failures, logout revocation, reset and single-use reset passed.
- [NOT TESTED] Staging admin setup email delivery, reset expiry and lockout timing.
- [NOT TESTED] Staging campaign, creative upload/serving, scheduling, proof-of-play and reconciliation workflow.
- [NOT TESTED] Razorpay test-mode checkout, webhook signatures, duplicate events and failure/refund handling.
- [NOT TESTED] HTTPS, CORS allowlist, backup restore, alerting and rollback in Coolify.

## Required before Android fleet launch

- [PASS] Release configurations reject non-HTTPS API URLs and disable mock/demo flags.
- [PASS] Source-level tests cover manifest, scheduling, integrity, device auth and DeviceOS policy behavior.
- [BLOCKED] Android SDK build/lint/test and release signing.
- [NOT TESTED] Physical pairing, heartbeat, GPS, playback, proof-of-play, reconnect, Device Owner/Lock Task and upgrade preservation.
- [BLOCKED] Independent DeviceOS backend staging and cutover validation.

## Safe after initial launch

- [NOT TESTED] Error-reporting integration and dashboards, after secret-safe configuration.
- [NOT TESTED] Performance/load testing, retention jobs and operational runbooks.
- [NOT TESTED] Prisma 7 configuration migration; do not combine with go-live changes.
- [NOT TESTED] Final DeviceOS service extraction after a separate reviewed design and migration plan.


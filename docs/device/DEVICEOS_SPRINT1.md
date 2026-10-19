# DeviceOS Sprint 1

The requirement-by-requirement handoff matrix is maintained in [`DEVICEOS_TEST_REPORT.md`](./DEVICEOS_TEST_REPORT.md).

## Local setup

The API uses the additive Prisma migration:

```text
apps/api/prisma/migrations/20261016120000_deviceos_foundation/
apps/api/prisma/migrations/20261016153000_deviceos_targeting_spec/
```

Generate the client without applying a migration:

```bash
pnpm --filter @ooro/api exec prisma generate
```

The PostgreSQL integration test is opt-in and requires an isolated disposable database. It refuses ordinary or production-looking URLs:

Run it with `OORO_DEVICEOS_INTEGRATION_TESTS=true` and a `DATABASE_URL` for the temporary `ooro_test` database whose `host` query points to the temporary PostgreSQL socket directory.

When Docker is available, the repository helper provisions an isolated container, applies migrations, runs the integration suite, and removes only that container:

```bash
bash scripts/deviceos-postgres-integration.sh
# Optional real APK release-path integration:
bash scripts/deviceos-postgres-integration.sh /absolute/path/to/signed-test.apk
```

DeviceOS storage defaults to private local filesystem mode for development. Configure S3-compatible storage for a real deployment:

```dotenv
DEVICEOS_STORAGE_MODE=s3
DEVICEOS_AAPT2_PATH=/opt/android-sdk/build-tools/35.0.0/aapt2
DEVICEOS_APKSIGNER_PATH=/opt/android-sdk/build-tools/35.0.0/apksigner
DEVICEOS_S3_BUCKET=private-bucket-name
DEVICEOS_S3_REGION=auto
DEVICEOS_S3_ENDPOINT=https://s3.example.com
DEVICEOS_S3_ACCESS_KEY_ID=...
DEVICEOS_S3_SECRET_ACCESS_KEY=...
DEVICEOS_DOWNLOAD_BASE_URL=https://api.example.com
```

Production API startup rejects non-S3 DeviceOS storage. Credentials are server-side only; the Android agent receives device credentials, never storage credentials.

Development filesystem storage uses an HMAC-signed, five-minute `/api/deviceos/storage` URL. Production never serves this local route; it returns private S3-compatible presigned URLs instead.
The agent requests a five-minute URL immediately before each download attempt and sends `Range` on an existing partial file, so API credentials are used to authorize URL issuance but are never used as object-storage credentials.
DeviceOS heartbeat and credential-rotation POSTs include a fresh UUID `requestId`; the backend records a bounded receipt to prevent replayed mutations.

## Flow

1. Create an existing OORO display and pairing code.
2. Install the DeviceOS debug agent on a development Android device.
3. Enter the existing display pairing code in the agent.
4. Register an application in `/admin/deviceos/applications`.
5. Keep the application allowlisted; blocking it prevents devices from receiving its desired state or APK downloads and records an audit event.
6. Upload an APK in `/admin/deviceos/releases`.
7. Approve the immutable release.
8. Create an individual, city, or percentage deployment in `/admin/deviceos/deployments`.
9. The agent reconciles the assignment through WorkManager and reports each durable state transition.

Release lineage is enforced at both layers: the backend rejects a changed signing certificate for an application, and the agent rejects a target version lower than the installed package version before creating a PackageInstaller session.
Campaign creation also excludes enrolled devices whose reported SDK is below the release minSdk or whose known inventory is newer than the target; devices without capability data remain eligible and are checked by the agent.

Failed active attempts are retained as installation results. The backend schedules at most two additional attempts with durable exponential backoff (`RETRY_WAIT`); a retry re-enters through `ASSIGNED`. Pausing a campaign prevents new work and resuming it reassigns paused targets.
The agent treats both `RETRY_WAIT` and a resumed `ASSIGNED` target as retryable when its durable local state is `FAILED`, so a pause/resume cycle does not strand a failed installation.
When a campaign is paused while a target is already downloading or installing, the agent defers further reconciliation until the campaign is active again; an already-committed PackageInstaller session is not forcibly cancelled.

Deployment creation accepts a caller-supplied `Idempotency-Key`, persisted as a unique campaign field. Repeating the same request returns the existing campaign; reusing the key for a different application, release, or target definition is rejected.

Authorized operations staff can rotate a device credential from the managed-device view. Existing active credentials are revoked transactionally, the new token is returned once, and only the credential identifier is written to the audit event.

PackageInstaller callbacks are persisted in the agent's Room database before reconciliation: success becomes `INSTALLED`, failure is reported with the installer error, and `STATUS_PENDING_USER_ACTION` remains a durable `PENDING_USER_ACTION` state while Android presents the supported confirmation UI. `HEALTH_CHECK` then validates the installed version and signing certificate separately from PackageInstaller success; the backend also rejects a `HEALTHY` receipt without a matching version and certificate digest. Already-compliant packages skip download and installation and are reported through the same health-check path.

The generated release artifact is currently unsigned (`app-release-unsigned.apk`) because no production signing credential is present in the repository. Sign it in the protected Android release pipeline before distribution.

## Sprint verification report

| Requirement area | Result | Evidence / limitation |
| --- | --- | --- |
| Prisma schema and additive migration generation | PASS | `prisma generate`, Prisma validation, and API TypeScript build pass; migrations are additive and have not been applied to production |
| Device enrollment, credential hashing/revocation, scoped state/events | PASS (code/unit) | API implementation and domain tests pass; the PostgreSQL HTTP integration is gated and NOT TESTED in the current environment |
| APK metadata/checksum/signing validation code | PASS | `aapt2`/`apksigner` inspected the built Screen Player APK; opt-in release integration uploaded, approved, stored, and deduplicated the real APK in disposable PostgreSQL/local storage |
| Private storage configuration | PASS | Local development backend and S3-compatible backend implemented; live S3 acceptance not run |
| Durable targeting, pause/resume, idempotent state events, retries, and health-gate pausing | PASS (code/unit) | Transactional implementation and domain tests pass; PostgreSQL persistence and HTTP integration are NOT TESTED in the current environment |
| Admin DeviceOS pages | PASS | Routes/components compile and use authenticated proxy; browser acceptance not run |
| Android agent debug/release compilation | PASS | Debug and release Gradle builds completed; release output is unsigned |
| Android agent policy unit tests | PASS | JVM tests cover terminal credential handling, maintenance windows, PackageInstaller result mapping, pending-user-action handling, resumable range validation, restart-session recovery, and retry reopening |
| Connected-device capability audit | PASS (read-only) | ADB observed TECNO KN3, Android API 35, no Device Owner, and existing `com.ooro.screenplayer`; no package installation or policy mutation was performed |
| Physical enrollment and OTA installation | NOT TESTED | Requires development API, valid signed APK, and hardware execution |
| Silent installation / Device Owner behavior | NOT TESTED | No Device Owner provisioning or ownership mutation performed |
| Screen Player playback/proof-of-play continuity during OTA | NOT TESTED | Must be accepted on target hardware |
| PostgreSQL integration and migration application | NOT TESTED | Docker's PostgreSQL daemon and local PostgreSQL server binaries are unavailable in the current environment; the opt-in tests safely skip unless an isolated `ooro_test` database is supplied; production was not touched |

## Hardware acceptance checklist

- [ ] DeviceOS enrolls against a development API using a real pairing code.
- [ ] Credential is stored and survives agent restart.
- [ ] Device reports installed packages and observation-mode capability.
- [ ] Invalid checksum is rejected before PackageInstaller.
- [ ] Wrong package and signing certificate are rejected.
- [ ] Insufficient storage is reported without changing the installed application.
- [ ] PackageInstaller result is received and persisted.
- [ ] `STATUS_PENDING_USER_ACTION` is shown explicitly on non-owner hardware.
- [ ] Application health is reported separately from installer success.
- [ ] Screen Player playback, proof-of-play, and pending events remain unaffected.
- [ ] Device Owner state remains unchanged throughout Sprint 1.

Silent installation, Device Owner policy control, rollback, restart recovery on target OEM firmware, and advertisement continuity require physical acceptance and are not certified by this sprint.

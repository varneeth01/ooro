# OORO DeviceOS Sprint 2 Acceptance Report

Date: 2026-10-20
Environment: `/home/varneeth/Documents/oodo`
Scope: validation only; no production database, bucket, fleet, Device Owner state, or installed application was changed.

## Executive result

Hardware-independent checks, isolated PostgreSQL acceptance, local private-storage release acceptance, and controlled test signing now pass. Live S3, agent-on-device, and Device Owner acceptance remain blocked by unavailable disposable S3 infrastructure or required operator authorization. Device Owner and silent-install capability are **not established**.

Production fleet rollout recommendation: **DO NOT APPROVE** until the blocked gates below are completed on disposable infrastructure and a dedicated authorized test device. This continuation adds constrained remote app restart/uninstall commands; it does not establish physical installation, OTA success, or Device Owner capability.

## Preflight evidence

| Check | Environment / command | Result | Evidence |
|---|---|---|---|
| Git protection | `git status --short` | PASS | Existing dirty worktree recorded before validation; unrelated changes were not touched. No reset, clean, checkout, or database reset was run. |
| Git hooks | `git config core.hooksPath`; `git rev-parse --git-path hooks`; inspect `.git/hooks` | PASS / diagnosed | `core.hooksPath` is unset; `.git/hooks` contains only `*.sample` files; no active repository hook was found. Exit 126 therefore originates outside the checked-in hook set, or from a caller-supplied hook path with a non-executable file/interpreter. Security checks were not disabled. |
| Android transport | `adb devices -l` | PASS | `16301675CN011643`, `TECNO_KN3`, USB, `device`. |
| Android OS | `adb shell getprop ro.build.version.sdk` | PASS | API 35. |
| Existing player | `adb shell pm path com.ooro.screenplayer` | PASS | Screen Player APK is installed. |
| Device Owner state | `adb shell dumpsys device_policy` | PASS (observation) | `Device Owner Type: -1`; no ownership change was attempted. |
| DeviceOS agent state | `adb shell pm path com.ooro.deviceagent` | PASS (observation) | No installed agent was reported. No installation was attempted. |
| PostgreSQL runner syntax | `bash -n scripts/deviceos-postgres-integration.sh` | PASS | Runner parses successfully. |
| PostgreSQL Docker runner | `bash scripts/deviceos-postgres-integration.sh` | BLOCKED | Runner exited 2 because Docker daemon is unavailable. The equivalent non-privileged local PostgreSQL path below passed. |
| PostgreSQL local binaries | `/usr/lib/postgresql/16/bin/{initdb,pg_ctl,postgres,createdb}` | PASS | An isolated cluster was initialized under `/tmp`, bound to loopback port 55444, and stopped after testing. The unrelated existing `ooro_audit` cluster was not accessed. |

### Diagnosing hook exit 126

Exit 126 means a command was found but could not be executed, commonly because a hook file lacks its execute bit or its shebang interpreter is unavailable. This checkout has no active hook to fix: `core.hooksPath` is unset and `.git/hooks` has only sample files. The failing caller should be rerun with:

```bash
GIT_TRACE=1 GIT_TRACE2=1 git commit ...
# or
GIT_TRACE=1 GIT_TRACE2=1 git push ...
```

Inspect the hook path printed by Git, then check `ls -l <hook>` and the interpreter named by its first line. Correct the external hook installation or executable permission in that owning environment. Do not use `--no-verify` and do not remove security validation.

## Local automated validation

Command:

```bash
pnpm --filter @ooro/api test
```

Result: **PASS** — 87 tests, 84 passed, 0 failed, 3 skipped. The skipped tests are the gated real-APK release integration and PostgreSQL integration paths.

With the disposable PostgreSQL cluster and isolated local storage enabled:

```bash
OORO_DEVICEOS_INTEGRATION_TESTS=true \
OORO_DEVICEOS_ALLOW_DISPOSABLE_TCP_DB=true \
DEVICEOS_STORAGE_MODE=local \
DEVICEOS_STORAGE_DIR=/tmp/ooro-deviceos-storage.<run> \
DATABASE_URL=postgresql://ooro@127.0.0.1:<port>/ooro_test?schema=public \
pnpm --filter @ooro/api test
```

Result: **PASS** — 85 passed, 0 failed, 2 skipped. Migrations from zero applied successfully before the run.

With the signed test APK and isolated local storage enabled:

```bash
DEVICEOS_TEST_APK_PATH=/tmp/ooro-deviceos-signing.<run>/deviceos-agent-v1.apk \
OORO_DEVICEOS_RELEASE_INTEGRATION_TESTS=true \
OORO_DEVICEOS_INTEGRATION_TESTS=true \
OORO_DEVICEOS_ALLOW_DISPOSABLE_TCP_DB=true \
DEVICEOS_STORAGE_MODE=local \
DEVICEOS_STORAGE_DIR=/tmp/ooro-deviceos-storage.<run> \
DATABASE_URL=postgresql://ooro@127.0.0.1:<port>/ooro_test?schema=public \
pnpm --filter @ooro/api test
```

Result: **PASS** — 86 passed, 0 failed, 1 skipped. The real release integration uploaded, approved, deduplicated, read, and cleaned up a signed APK.

Existing Sprint 1 build evidence remains valid and was not invalidated by this validation-only sprint:

- API build: **PASS**.
- Web build/typecheck: **PASS**.
- Android debug/release compilation and unit tests: **PASS**; controlled test signing is also demonstrated below. Production release signing remains external.
- Prisma schema validation and `git diff --check`: **PASS**.

The passing local tests cover deterministic targeting, state transitions, retry/backoff, pending-user-action modeling, package/signature/checksum validation, replay protection, authorization, and campaign health gates. They do not replace database, object-storage, or hardware acceptance.

Sprint 2 code changes validated during this run:

- `apps/api/src/domain/deviceos-deployment.ts` now compares idempotency targeting JSON canonically, so database key ordering cannot turn an identical retry into a false conflict.
- `apps/deviceos-android/app/build.gradle.kts` accepts `deviceVersionCode` and `deviceVersionName` build properties for controlled test artifacts; production signing configuration was not changed.

## Acceptance matrix

| Test | Environment | Result | Log / code evidence |
|---|---|---|---|
| Apply all Prisma migrations from zero | Isolated local PostgreSQL | PASS | All 33 migrations applied successfully to a temporary cluster on loopback port 55444; cluster was stopped afterward. |
| Release registration and duplicate handling | Isolated PostgreSQL + local private storage | PASS | Full suite with integration enabled: 86 passed, 0 failed, 1 skipped; real APK upload, approval, duplicate handling, and wrong-package rejection passed. |
| Device enrollment, credential scoping/revocation | Isolated PostgreSQL | PASS | Full suite with integration enabled; enrollment, replay, authorization, credential expiry/rotation/revocation passed. |
| Deployment targeting and deterministic canary | Isolated PostgreSQL | PASS | Full suite with integration enabled; idempotent repeat and conflict behavior passed after canonical JSON comparison fix. |
| Desired-state reconciliation / offline recovery | API + Android source/build | PASS (logic/build) / NOT TESTED (device) | `apps/deviceos-android/app/src/main/java/com/ooro/deviceagent/sync/SyncWorker.kt`; no enrolled physical agent. |
| Concurrent deployment transactions | Isolated PostgreSQL | NOT TESTED | The available integration suite exercises transactional/idempotent paths but does not include a dedicated concurrent worker test. |
| Concurrent deployment worker claiming | Backend source / schema inspection | NOT IMPLEMENTED | No server-side deployment worker, lease/claim columns, or worker entry point exists in the current implementation. DeviceOS uses device-pull reconciliation through `/api/deviceos/state`, durable target rows, optimistic `rowVersion`, and retry timestamps. A worker crash/expired-lease test cannot truthfully be run until a worker/lease component exists. |
| Rollback transaction | Backend | NOT IMPLEMENTED / NOT TESTED | Automatic APK downgrade/rollback is intentionally unsupported; recovery uses a separately approved higher-version release. See `docs/device/DEVICEOS_SECURITY_REVIEW.md` and `DEVICEOS_OPERATIONS.md`. |
| Private APK upload/download | Local private storage acceptance | PASS | Real APK upload/read/delete passed using an isolated `DEVICEOS_STORAGE_DIR`; objects were not public. |
| Private S3 upload/download | Disposable S3-compatible bucket | BLOCKED | `apps/api/src/domain/deviceos-storage.ts` implements private S3 `PutObject`, `GetObject`, `DeleteObject`, and short-lived presigned URLs; no S3-compatible server or disposable bucket was available. `mc` is GNU Midnight Commander, not the MinIO client. |
| Unauthorized and expired download URL | Local storage unit tests | PASS (logic) / BLOCKED (S3 acceptance) | Storage tests cover HMAC expiry/key binding; live private-bucket enforcement not run. |
| Checksum, package, SDK, signing validation | Real signed APK + API integration | PASS | Signed DeviceOS APK passed metadata, checksum, package, SDK, certificate, approval, duplicate, and wrong-package checks. |
| Immutable release behavior and cleanup | API/local storage tests | PASS (logic) / BLOCKED (S3 lifecycle) | Content-addressed local-storage tests pass; real bucket cleanup/lifecycle not verified. |
| Interrupted download and resume | Android unit/build | PASS (logic/build) / NOT TESTED (device/network) | Agent uses partial-file/range flow; no physical download was executed. |
| Controlled signed agent/player release | External test keystore | PASS | Two APKs were built outside the repository with version codes 1 and 2, package `com.ooro.deviceagent`, minSdk 26, targetSdk 35, APK v2/v3 verification, and identical certificate digest `ca744eaa166c5ed367892ac23754ba58158413e91416f2d8c493666f2d03d7c6`. Checksums were `6e9dbe9bdf4dc8c1bf18adce73860d1fe2465b04e788013933adab4f92d6f0f2` and `f41ff3ed2fb998ffa9cb9295b5ae9e0bfc211a29a7f1ed35096d79e2b58281ea`. No credential was committed. |
| ADB connectivity and read-only device inspection | TECNO KN3 | PASS | Device serial, model, API 35, Screen Player package, and no-owner state captured above. |
| Agent installation/enrollment/heartbeat/telemetry/inventory | TECNO KN3 | NOT TESTED | Requires operator authorization to install the debug agent and a reachable development API/pairing flow. |
| Observation-mode PackageInstaller behavior | TECNO KN3 | NOT TESTED | Requires authorized agent installation and a test APK. Any `STATUS_PENDING_USER_ACTION` result must be recorded; it cannot be treated as silent install. |
| Device reboot recovery | TECNO KN3 | NOT TESTED | Requires authorized agent installation and reboot window. |
| Device Owner provisioning | Dedicated test device | BLOCKED / NOT AUTHORIZED | Must not be attempted on the connected TECNO or production motherboard. No owner state was modified. |
| Silent install/update, Lock Task, playback/proof preservation | Dedicated provisioned hardware | NOT TESTED | Requires separate written operator authorization and hardware acceptance. Compilation/source inspection is insufficient. |

## Exact disposable PostgreSQL setup

The repository runner is the approved path and keeps the database disposable:

```bash
cd /home/varneeth/Documents/oodo
bash scripts/deviceos-postgres-integration.sh
# optional real signed APK path:
bash scripts/deviceos-postgres-integration.sh /absolute/path/to/signed-test.apk
```

It creates a temporary `postgres:16-alpine` container, waits for readiness, exports a temporary `DATABASE_URL`, applies `prisma migrate deploy`, and runs the API tests. Docker must be installed and its daemon must be running. If Docker is unavailable, use a separately provisioned disposable PostgreSQL instance and set `DATABASE_URL` only for that instance, together with:

```bash
export OORO_DEVICEOS_INTEGRATION_TESTS=true
export OORO_DEVICEOS_ALLOW_DISPOSABLE_TCP_DB=true
pnpm --filter @ooro/api exec prisma migrate deploy
pnpm --filter @ooro/api test
```

Record the host, database name, migration output, test output, and teardown result. Never reuse production credentials or a production database URL.

The successful non-privileged local run used the equivalent of:

```bash
cluster_dir="$(mktemp -d /tmp/ooro-deviceos-pg.XXXXXX)"
/usr/lib/postgresql/16/bin/initdb -D "$cluster_dir" -U ooro --auth=trust
/usr/lib/postgresql/16/bin/pg_ctl -D "$cluster_dir" \
  -o "-p 55444 -h 127.0.0.1 -c unix_socket_directories=$cluster_dir" \
  -l "$cluster_dir/postgres.log" -w start
/usr/lib/postgresql/16/bin/createdb -h 127.0.0.1 -p 55444 -U ooro ooro_test
```

After exporting the test-only `DATABASE_URL`, migrations and the API suite were run. `pg_ctl ... stop` stopped the cluster; the unrelated existing PostgreSQL service was not queried or modified.

## Exact private object-storage setup

Use a disposable private S3-compatible bucket and a test-only IAM/access key. Configure only the test process, without printing values. Cloudflare R2 is suitable: create a test-only bucket in the R2 dashboard, create an API token restricted to that bucket with Object Read/Write (and no account-wide permissions), and use the R2 S3 endpoint shown by Cloudflare. Do not enable public access or a public custom domain.

```bash
export DEVICEOS_STORAGE_MODE=s3
export DEVICEOS_S3_BUCKET=<disposable-private-bucket>
export DEVICEOS_S3_REGION=auto
export DEVICEOS_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
export DEVICEOS_S3_ACCESS_KEY_ID=<test-access-key>
export DEVICEOS_S3_SECRET_ACCESS_KEY=<test-secret-key>
export DEVICEOS_AAPT2_PATH=<absolute-test-aapt2>
export DEVICEOS_APKSIGNER_PATH=<absolute-test-apksigner>
```

Use the same environment only for the test process:

```bash
pnpm --filter @ooro/api test
```

Run the release integration with a signed test APK, then verify bucket privacy from an unauthenticated client, URL expiry after the configured short lifetime, checksum mismatch rejection, immutable duplicate behavior, interrupted range download, and explicit test-object cleanup. The Android agent must receive only its device credential and presigned URL, never S3 credentials.

Acceptance must include a direct unauthenticated `GetObject` denial, a presigned URL that works only before expiry, deletion of the test object, and revocation/deletion of the test token. If an S3-compatible service is not available, keep this gate **BLOCKED**; do not substitute a public bucket.

## Signed-release and hardware procedure (prepared, not executed)

1. Obtain a protected test signing key from the approved signing system; do not store it in Git or this worktree.
2. Build the agent with `com.ooro.deviceagent` and the Screen Player with their existing package identities. Confirm version codes and certificate digests using `aapt2`/`apksigner`.
3. Install the agent on a dedicated development device only after operator authorization. Do not install it on the connected TECNO as part of this report.
4. Enroll using an existing verified pairing flow against a development API. Confirm heartbeat, telemetry, inventory, and credential revocation in the admin/API audit trail.
5. Exercise observation-mode installation and record a user-action result if Android requires it. Do not infer Device Owner behavior.
6. For Device Owner acceptance, use a dedicated, approved test device and the Android provisioning procedure appropriate to its OEM/OS. Obtain separate authorization before any provisioning command. Never attempt a second Device Owner assignment and never alter the production motherboard during this sprint.
7. Only after the above succeeds, test silent install/update, app-data preservation, multiple managed apps, reboot/offline recovery, and Screen Player/proof-of-play continuity.

## Observation-mode hardware procedure (prepared, not executed)

The connected device remains untouched. After explicit operator approval and only against a development API:

```bash
adb -s 16301675CN011643 get-state
adb -s 16301675CN011643 install /tmp/ooro-deviceos-signing.<run>/deviceos-agent-v1.apk
adb -s 16301675CN011643 shell am start -n com.ooro.deviceagent/.MainActivity
adb -s 16301675CN011643 logcat -c
adb -s 16301675CN011643 logcat -v time -s DeviceOS
```

The operator enters an existing development pairing code in the agent UI. Verify the API audit trail for enrollment, then heartbeat, telemetry, inventory, and credential rotation/revocation. Record PackageInstaller results, especially `STATUS_PENDING_USER_ACTION`; observation mode must not be interpreted as silent installation. Do not use `adb install -r` against the Screen Player or DeviceOS Agent unless the exact test artifact and data-preservation objective have been approved.

## Device Owner acceptance recommendation

Do not provision the connected TECNO KN3 or the production motherboard. Use a dedicated, non-production test device with an approved backup/recovery plan. After separate written operator approval, verify the receiver declared in `apps/deviceos-android/app/src/main/AndroidManifest.xml`:

```text
com.ooro.deviceagent/.kiosk.DeviceOsAdminReceiver
```

Provisioning commands must be executed only on that dedicated device and only after confirming it is eligible for Device Owner provisioning. A typical ADB provisioning command is:

```bash
adb -s <dedicated-test-serial> shell dpm set-device-owner com.ooro.deviceagent/.kiosk.DeviceOsAdminReceiver
adb -s <dedicated-test-serial> shell dumpsys device_policy | rg 'Device Owner|device-owner'
```

This is intentionally **not executed**. Do not attempt a second owner assignment, remove an existing owner, or factory-reset any current OORO device. Silent install, app-data preservation, Lock Task, reboot/offline recovery, invalid-signature rejection, advertisement continuity, and proof-of-play preservation can be marked PASS only after physical execution on this dedicated device.

## Remaining blockers and operator actions

- Provide a disposable private S3-compatible endpoint and test-only credentials, then execute the object-storage acceptance and clean up the test bucket.
- Add a dedicated concurrent deployment worker test before treating concurrency acceptance as complete.
- Authorize installation of the debug DeviceOS agent on a designated development device and provide a reachable development API/pairing code.
- Separately authorize Device Owner testing on a dedicated non-production device. Do not use the connected TECNO or production motherboard without explicit approval.
- Re-run the hook command with `GIT_TRACE`/`GIT_TRACE2` in the environment that actually returns 126 and repair that external hook installation without bypassing checks.

## Production readiness decision

**NOT READY / DO NOT DEPLOY.** The implementation has strong local evidence, but the required durable-database, private-storage, signed-artifact, physical-agent, and Device Owner gates remain unproven. No silent installation, production storage acceptance, production signing acceptance, or fleet safety acceptance is claimed.

## Final-gate disposition

### A. Concurrent deployment worker

**NOT IMPLEMENTED / NOT TESTED.** The current architecture has no server worker to launch. The existing database-backed controls are not equivalent to worker lease acceptance. Required future evidence is two or more workers claiming the same eligible rows, one worker crash, lease expiry/reclaim, bounded retry backoff, duplicate-command idempotency, and a proof that each logical device/release target has at most one active attempt.

### B. Private S3

**BLOCKED.** The adapter and configuration were inspected in `apps/api/src/domain/deviceos-storage.ts` and `apps/api/src/config.ts`. The environment has AWS CLI but no valid test S3 credentials, no MinIO/Garage server, and `mc` is GNU Midnight Commander rather than an object-storage client. The Cloudflare R2 setup in this report is ready for a test-only bucket and restricted token; no public APK URL was created.

## Remote fleet management continuation — 2026-10-20

### Capability audit

| Capability | Result | Evidence |
|---|---|---|
| Device enrollment and credential rotation/revocation | IMPLEMENTED | `apps/api/src/server.ts:237-266,344-369`; `apps/deviceos-android/app/src/main/java/com/ooro/deviceagent/network/DeviceOsApi.kt`; Keystore-backed `SecureStore`. |
| Device heartbeat and request replay protection | IMPLEMENTED | `apps/api/src/server.ts:312-341`; heartbeat updates `lastSeenAt`, agent version, capabilities, and audit events. |
| Application inventory and app-version reporting | IMPLEMENTED | `apps/api/src/server.ts:322-338`; `SyncWorker.kt:175`; admin inventory route at `server.ts:400-410` (line numbers may shift after edits). |
| Desired-state polling | IMPLEMENTED | `server.ts:268-286`; `SyncWorker.kt:31-45`; WorkManager periodic and immediate reconciliation. |
| PackageInstaller integration | IMPLEMENTED / OBSERVATION-LIMITED | `ApkInstaller.kt:65-74`; `InstallResultReceiver` records success, failure, and `STATUS_PENDING_USER_ACTION`. Silent installation is not claimed. |
| APK download, range resume, checksum/package/version/certificate validation | IMPLEMENTED | `DeviceOsApi.kt:download`; `ApkInstaller.kt:39-63`; API release download authorization at `server.ts:552-571`. |
| Installation receipts and health | IMPLEMENTED | `server.ts:573-648`; `InstallationResult`, `DeploymentAttempt`, and `HEALTHY` certificate/version gate. |
| Device telemetry | IMPLEMENTED | `SyncWorker.kt:173`; `server.ts:331,374-380`; telemetry is sent with heartbeat and exposed to admins. |
| Deployment targeting | IMPLEMENTED | `deviceos-deployment.ts:52-124`; device, group, city, and deterministic percentage targeting. |
| Pause/resume deployments | IMPLEMENTED | `server.ts:678-687`; `pauseDeviceOsCampaign` and `resumeDeviceOsCampaign`. |
| Agent self-update and restart recovery | PARTIAL | Agent releases can use the same release pipeline and boot/package-replaced receiver; install-session recovery is implemented in `SyncWorker.kt:97-110`. A real v1→v2 device update was not executed. |
| Typed remote app restart | IMPLEMENTED / NOT TESTED ON HARDWARE | Added `DeviceOsCommand`, admin queue route `server.ts:443-461`, agent command polling/launch in `SyncWorker.kt:47-66`. Only a package launch intent is supported. |
| Safe remote uninstall | IMPLEMENTED / OBSERVATION-LIMITED | Server requires a registered, noncritical application with `remoteUninstallAllowed=true` and rejects DeviceOS/Screen Player; observation mode opens Android’s uninstall confirmation UI and reports `PENDING_USER_ACTION`. |
| Arbitrary remote shell execution | MISSING BY DESIGN | No shell, command string, or arbitrary executable endpoint was added. |

### Software changes made in this continuation

- Added migration `apps/api/prisma/migrations/20261020150000_deviceos_commands/migration.sql` and `DeviceOsCommand` persistence.
- Added `critical` and `remoteUninstallAllowed` application policy fields. Existing applications default to critical and uninstall-disabled.
- Added authenticated device command pull/ack endpoints and admin queue/history endpoints. Commands are typed and auditable.
- Added agent handling for restart and uninstall. Uninstall is explicitly reported as user-action pending in observation mode; it is not represented as silent success.
- No production database, production bucket, signing key, Android device, Device Owner state, or Screen Player package was changed.

### Exact commands executed in this continuation

```bash
pwd
rg --files -g '!*node_modules*' -g '!*venv*'
git status --short
ps -eo pid,stat,cmd | rg 'deviceos|postgres|pnpm|adb|gradle'
command -v adb docker aws mc psql initdb pg_ctl createdb apksigner aapt2 java
adb devices -l
docker info
aws --version
mc --version
aws configure list
pnpm --filter @ooro/api exec prisma format
pnpm --filter @ooro/api exec prisma generate
pnpm --filter @ooro/api build
pnpm --filter @ooro/api test
apps/screen-android/gradlew -p apps/deviceos-android testDebugUnitTest assembleDebug --no-daemon
```

The PostgreSQL integration used an isolated cluster and database only:

```bash
cluster_dir="$(mktemp -d /tmp/ooro-deviceos-pg.XXXXXX)"
/usr/lib/postgresql/16/bin/initdb -D "$cluster_dir" -U ooro --auth=trust
/usr/lib/postgresql/16/bin/pg_ctl -D "$cluster_dir" \
  -o "-p 55445 -h 127.0.0.1 -c unix_socket_directories=$cluster_dir" \
  -l "$cluster_dir/postgres.log" -w start
/usr/bin/createdb -h 127.0.0.1 -p 55445 -U ooro ooro_test
DATABASE_URL="postgresql://ooro@127.0.0.1:55445/ooro_test?schema=public" \
  OORO_DEVICEOS_INTEGRATION_TESTS=true \
  OORO_DEVICEOS_ALLOW_DISPOSABLE_TCP_DB=true \
  DEVICEOS_STORAGE_MODE=local \
  DEVICEOS_STORAGE_DIR="$(mktemp -d /tmp/ooro-deviceos-storage.XXXXXX)" \
  pnpm --filter @ooro/api exec prisma migrate deploy
DATABASE_URL="postgresql://ooro@127.0.0.1:55445/ooro_test?schema=public" \
  OORO_DEVICEOS_INTEGRATION_TESTS=true \
  OORO_DEVICEOS_ALLOW_DISPOSABLE_TCP_DB=true \
  DEVICEOS_STORAGE_MODE=local \
  DEVICEOS_STORAGE_DIR="$(mktemp -d /tmp/ooro-deviceos-storage.XXXXXX)" \
  pnpm --filter @ooro/api test
/usr/lib/postgresql/16/bin/pg_ctl -D "$cluster_dir" -m fast -w stop
```

### Current execution result

| Check | Result | Evidence |
|---|---|---|
| API build after command-channel changes | PASS | `pnpm --filter @ooro/api build` completed successfully. |
| API static/unit suite | PASS | 91 tests: 87 passed, 0 failed, 4 skipped before DB integration. |
| Isolated PostgreSQL migrations | PASS | All 35 migrations, including `20261020150000_deviceos_commands`, applied to loopback port 55445; cluster stopped afterward. |
| PostgreSQL-backed API suite | PASS | 91 tests: 88 passed, 0 failed, 3 skipped with disposable DB and local storage. |
| Android agent unit tests and debug build | PASS | `testDebugUnitTest assembleDebug --no-daemon` completed with `BUILD SUCCESSFUL`. |
| Docker | BLOCKED | Docker CLI exists, but daemon returned `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`. |
| Local S3-compatible service without Docker | BLOCKED | No `minio`, `garage`, `seaweedfs`, `rclone`, or `s5cmd` binary found. `mc` is GNU Midnight Commander, not the MinIO client. AWS CLI has no configured credentials. |
| ADB / TECNO KN3 inspection in this run | BLOCKED | `adb devices -l` returned only `List of devices attached`; no device was visible. No install, reboot, reset, uninstall, or Device Owner operation was attempted. |

Environment configuration used for the successful local integration was test-only and contained no secrets:

```text
DATABASE_URL=postgresql://ooro@127.0.0.1:55445/ooro_test?schema=public
OORO_DEVICEOS_INTEGRATION_TESTS=true
OORO_DEVICEOS_ALLOW_DISPOSABLE_TCP_DB=true
DEVICEOS_STORAGE_MODE=local
DEVICEOS_STORAGE_DIR=/tmp/ooro-deviceos-storage.<random>
```

No S3 access key, secret, production URL, or production database URL was used or printed.

### Physical acceptance status

The following remain **NOT TESTED** or **BLOCKED** and must not be inferred from compilation:

- harmless test-app installation and update on TECNO KN3;
- DeviceOS v1→v2 update on hardware;
- interrupted download and network-loss recovery on hardware;
- agent restart after update;
- backend receipts from a real device heartbeat and final dashboard state;
- private S3 upload/download, expiry, unauthenticated denial, and cleanup;
- silent installation, Lock Task, or Device Owner behavior.

The TECNO procedure remains observation-only after explicit operator approval:

```bash
adb -s <authorized-tecno-serial> get-state
adb -s <authorized-tecno-serial> shell getprop ro.product.model
adb -s <authorized-tecno-serial> shell getprop ro.build.version.sdk
adb -s <authorized-tecno-serial> shell pm path com.ooro.screenplayer
adb -s <authorized-tecno-serial> shell pm path com.ooro.deviceagent
adb -s <authorized-tecno-serial> shell dumpsys device_policy | rg 'Device Owner|device-owner'
adb -s <authorized-tecno-serial> install /absolute/path/to/harmless-test-agent.apk
adb -s <authorized-tecno-serial> shell am start -n com.ooro.deviceagent/.MainActivity
adb -s <authorized-tecno-serial> logcat -v time -s DeviceOS
```

Before installation, verify the APK with `aapt2 dump badging`, `apksigner verify --verbose`, and SHA-256; verify that the agent `BuildConfig.API_BASE_URL` is a development API URL; generate a development pairing code; and record the backend `DEVICE_ENROLLED`, `DEVICE_HEARTBEAT`, deployment event, installation result, and `HEALTHY` audit events. Do not use `adb install -r` on Screen Player, do not reboot, and do not run `dpm set-device-owner` on TECNO.

### Dedicated Device Owner readiness guide

Use a separate, backed-up, non-production OORO motherboard. Written operator approval is required immediately before provisioning. The manifest receiver is:

```text
com.ooro.deviceagent/.kiosk.DeviceOsAdminReceiver
```

After confirming the device is eligible and has no existing owner, the authorized operator may use:

```bash
adb -s <dedicated-test-serial> shell dpm set-device-owner com.ooro.deviceagent/.kiosk.DeviceOsAdminReceiver
adb -s <dedicated-test-serial> shell dumpsys device_policy | rg 'Device Owner|device-owner'
```

The agent must then verify `DevicePolicyManager.isDeviceOwnerApp`, apply a Lock Task allowlist containing `com.ooro.deviceagent` and `com.ooro.screenplayer`, and keep the test application package outside the critical allowlist unless it is explicitly approved. Device Owner acceptance must separately demonstrate PackageInstaller installs without user interaction, restart/update preservation, failed-download recovery, reboot recovery, Screen Player continuity, and rollback/error handling. None of these actions was executed in this continuation.

### Remaining prerequisites and approval gates

- Provide a disposable private R2/MinIO-compatible bucket and restricted test-only credentials. Keep public access disabled; use `DEVICEOS_STORAGE_MODE=s3`, an R2 endpoint, bucket-scoped read/write token, and short-lived presigned URLs. Run direct unauthenticated denial, expiry, cleanup, and token revocation checks.
- Reconnect TECNO KN3 and provide explicit approval for the non-destructive observation-mode agent installation. The current ADB state is no device connected.
- Provide a harmless signed test APK, or approve the repository’s dedicated test-signing artifact, with its exact development API endpoint recorded.
- Authorize a separate non-production motherboard for Device Owner provisioning. Do not use the TECNO or a production motherboard.
- Treat `PENDING_USER_ACTION` as a required Android operator step in observation mode. It is not installation success.

Final disposition for this continuation: **SOFTWARE CONTROL PATH PASS; HARDWARE/S3 ACCEPTANCE BLOCKED; PRODUCTION DEPLOYMENT NOT APPROVED.** A remote deployment is successful only when storage retrieval, hash/signature validation, Android install success, independent package/version verification, healthy agent heartbeat, and accurate dashboard state are all present in real evidence.

## TECNO KN3 observation retry — 2026-10-20

Result: **PARTIAL PASS / NOT A DEPLOYMENT ACCEPTANCE**.

The authorized non-destructive observation procedure was executed against serial `16301675CN011643` using a disposable local API and database. The device was connected over USB ADB but had no active network interface; `adb reverse` was used to reach the local API without changing device networking.

Exact commands and evidence:

```bash
adb devices -l
# 16301675CN011643 device usb:3-1 product:KN3-IN model:TECNO_KN3

adb -s 16301675CN011643 shell getprop ro.product.model
# TECNO KN3
adb -s 16301675CN011643 shell getprop ro.build.version.sdk
# 35
adb -s 16301675CN011643 shell pm path com.ooro.screenplayer
adb -s 16301675CN011643 shell dumpsys device_policy | rg 'Device Owner|device-owner|Device Owner Type'
# Device Owner Type: -1

apps/screen-android/gradlew -p apps/deviceos-android \
  -PdeviceApiBaseUrl=http://127.0.0.1:8080 assembleDebug --no-daemon
aapt2 dump badging apps/deviceos-android/app/build/outputs/apk/debug/app-debug.apk
apksigner verify --verbose apps/deviceos-android/app/build/outputs/apk/debug/app-debug.apk

adb -s 16301675CN011643 reverse tcp:8080 tcp:8080
adb -s 16301675CN011643 install -r \
  apps/deviceos-android/app/build/outputs/apk/debug/app-debug.apk
# Performing Streamed Install
# Success

adb -s 16301675CN011643 shell am start -n com.ooro.deviceagent/.MainActivity
adb -s 16301675CN011643 shell input text OORO26
adb -s 16301675CN011643 shell input tap 800 294
```

APK evidence: package `com.ooro.deviceagent`, version code `1`, version name `0.1.0`, min SDK `26`, target SDK `35`; `apksigner` verified the APK using v2. The debug artifact was built with `API_BASE_URL=http://127.0.0.1:8080` and reached the disposable API through ADB reverse. No production endpoint was embedded or contacted.

Disposable backend evidence:

```text
DEVICE_ENROLLED  2026-10-20 17:23:56.911
DEVICE_HEARTBEAT 2026-10-20 17:24:40.404
ManagedDevice: ENROLLED, agent 0.1.0/code 1, Android 15, TECNO KN3
Inventory: populated from Android PackageManager; certificate/version metadata recorded
```

The agent UI displayed `Enrolled. Sync scheduled.` The first scheduled WorkManager run was blocked by Android’s `NetworkType.CONNECTED` constraint because `wlan0` was down. The already-scheduled reconciliation job was then triggered with the Android JobScheduler namespace:

```bash
adb -s 16301675CN011643 shell cmd jobscheduler run -f \
  -n androidx.work.systemjobscheduler com.ooro.deviceagent 0
adb -s 16301675CN011643 shell cmd jobscheduler run -f \
  -n androidx.work.systemjobscheduler com.ooro.deviceagent 2
```

This produced the real `DEVICE_HEARTBEAT` receipt. No APK release was assigned, so no download, signature validation against a release, PackageInstaller application install, application version compliance, or dashboard deployment state was claimed. Screen Player remained installed; Device Owner remained unset; no reboot, reset, uninstall, or Device Owner command was executed.

The disposable API, PostgreSQL cluster, local storage directory, and ADB reverse tunnel were stopped/removed from active use after evidence capture. The newly installed observation agent was not uninstalled during this retry so the operator can inspect it; it is not connected to production and will not receive production commands.

### C. Android observation mode

**NOT TESTED.** Fresh read-only evidence: ADB state `device`; model `TECNO KN3`; API 35; Screen Player installed; DeviceOS Agent absent; `Device Owner Type: -1`. Installation, enrollment, heartbeat, inventory, download, PackageInstaller handling, logs, and backend receipts remain pending explicit operator authorization.

### D. Dedicated-device acceptance

**NOT TESTED / BLOCKED pending authorization.** The dedicated-device procedure and receiver component are documented above. No provisioning, reset, owner change, reboot, uninstall, or APK install was performed. Silent installation, Lock Task, reboot/offline recovery, application-data preservation, and advertisement/proof-of-play continuity therefore have no hardware PASS evidence.

### E. Remote lifecycle execution update — TECNO KN3

This section supersedes the earlier “no device connected” statement for the 2026-10-20 retry. The authorized observation-mode run reached the Android package-install boundary without changing Device Owner state or touching Screen Player.

| Capability/check | Result | Real evidence |
|---|---|---|
| Agent installation and enrollment | PASS | `adb install -r` of the development Agent succeeded; the UI displayed `Enrolled. Sync scheduled.`; backend recorded `DEVICE_ENROLLED`. |
| Heartbeat and inventory | PASS | Forced WorkManager/JobScheduler execution recorded `DEVICE_HEARTBEAT`; the disposable database contained Android 15, TECNO KN3, agent version code 3, and PackageManager inventory. |
| Agent v1→v2→v3 update path | PASS | Same-package development APK updates succeeded with ADB; final device package was `com.ooro.deviceagent`, version code `3`, version name `0.3.0`. This is not a production OTA acceptance. |
| App registration, release publication, approval, and targeting | PASS | Existing admin APIs registered `com.ooro.deviceostest`, uploaded and approved release `0799dd47-0767-465a-9a52-b7ba367e827a`, and targeted device `7f1764a0-e90e-4a82-aab2-843517cfb04b`. |
| Storage retrieval | PASS | Existing local disposable storage returned the APK through the API download URL; no production or public bucket was used. |
| APK integrity and signing validation | PASS | Attempt 1 and attempt 3 recorded `bytesDownloaded=2838062` and `checksumVerified=true`; release SHA-256 was `0ca0001582f46dfe20897238e401672928f7610d671081e74a1fbb04a259dfba`; release certificate SHA-256 was `b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33`. |
| Android package installation | BLOCKED / PENDING_USER_ACTION | PackageInstaller opened the system approval flow. The device showed the unknown-source approval screen; after the available operator setting interaction, the agent/backend state became `PENDING_USER_ACTION`. `pm list packages` still did not contain `com.ooro.deviceostest`. |
| Independent installed version and health | NOT TESTED | There is no installed test-app package, `HEALTHY` receipt, or accurate final dashboard state to verify. |

Exact hardware commands used for the final transition:

```bash
adb -s 16301675CN011643 shell cmd jobscheduler run -f \
  -n androidx.work.systemjobscheduler com.ooro.deviceagent 13
adb -s 16301675CN011643 shell pm list packages | rg 'com.ooro.deviceostest'
adb -s 16301675CN011643 shell dumpsys device_policy | \
  rg 'Device Owner|device-owner|Device Owner Type'
```

Observed result:

```text
Running job [FORCED]
DeploymentTarget: PENDING_USER_ACTION, attemptCount=2
DeploymentAttempt 3: PENDING_USER_ACTION, bytesDownloaded=2838062, checksumVerified=true, installerSessionId=1743403807
Device Owner Type: -1
com.ooro.deviceostest: absent
```

Two repository-local defects found during real execution were fixed and rebuilt:

- `ApkInstaller.kt` now uses a mutable, explicitly addressed `PendingIntent` for the Android PackageInstaller commit callback. Android 15 rejected the prior immutable callback with “The commit() status receiver should come from a mutable PendingIntent”.
- `DeviceOsApi.kt` now treats an already-complete local APK as resumable-download completion, avoiding an invalid `Range: bytes=<full-size>-` request and HTTP 416 on retry.

The remaining operator-controlled step is to complete Android’s install approval for `com.ooro.deviceagent` and then approve the harmless test-app confirmation if Android presents it. Do not use `appops`, Device Owner provisioning, reset, reboot, Screen Player uninstall, or production credentials as a substitute. Until the package appears in `pm list packages`, its version/signature are independently checked, the agent reports health, and the dashboard shows the final state, this deployment must remain **BLOCKED**.

### F. Android 15 foreground approval follow-up — 2026-10-20

A second disposable deployment was started after installing Agent v0.4.0 (version code 4) on TECNO KN3. The fresh PackageInstaller session reached `mFinalStatus=0` with the complete APK staged, but Android did not present the confirmation UI while the Agent was backgrounded. The logcat evidence was:

```text
Background activity launch blocked!
callingPackage: com.ooro.deviceagent
intent: android.content.pm.action.CONFIRM_INSTALL
```

Repository fix: `InstallResultReceiver` now persists the PackageInstaller approval intent and sends an explicit in-app signal; the visible `MainActivity` launches that intent only while foregrounded. This avoids requesting a background activity launch and still requires the operator to approve Android’s system UI. The v0.4.0 APK was installed over the existing development Agent with `adb install -r`; Screen Player and Device Owner state were unchanged.

Current hardware evidence after the fix:

```text
Agent: com.ooro.deviceagent versionCode=4 versionName=0.4.0
Device Owner Type: -1
Test package com.ooro.deviceostest: absent
Fresh PackageInstaller session: 1569987158, mFinalStatus=0, mSessionApplied=false
Deployment target: INSTALLING
```

Result: **BLOCKED / NOT DEPLOYMENT ACCEPTANCE**. A user-visible Android approval action is still required; no `adb` command was used to bypass it. Android unit tests and debug build passed after the change:

```bash
apps/screen-android/gradlew -p apps/deviceos-android \
  testDebugUnitTest assembleDebug --no-daemon
```

### G. Successful harmless application lifecycle acceptance — 2026-10-21

The disposable v2 release completed the full acceptance sequence on TECNO KN3 after the package-visibility and debug-loopback scheduling fixes. The same deployment target was used for storage retrieval, validation, installation, independent package verification, health reporting, and final backend state.

```text
Application: com.ooro.deviceostest
Release: 1.0.0 / versionCode 1 for the original run, then development v2 release 8ea58dbd-28a6-4d9e-853d-99460d6d0e61
v2 SHA-256: cdef9505c38ab49aa3f0fa1c4318260cf8f9b0c665a91ab84b8c7382be589bc4
Certificate SHA-256: b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33
Target: a57fa992-e597-4163-8a04-6a1e2b3046d9
Final target state: HEALTHY
```

Backend audit sequence for target `a57fa992-e597-4163-8a04-6a1e2b3046d9`:

```text
ASSIGNED → DOWNLOADING → DOWNLOADED → VERIFIED → INSTALLING
→ PENDING_USER_ACTION → INSTALLED → HEALTH_CHECK → HEALTHY
```

Final attempt evidence:

```text
bytesDownloaded=2838050
checksumVerified=true
installerStatus=SUCCESS
installed package: com.ooro.deviceostest
installed versionCode=2, versionName=2.0.0, apkSigningVersion=2
Device Owner Type: -1
Screen Player: still installed
```

Exact independent verification commands:

```bash
aapt2 dump badging /tmp/ooro-deviceos-testapp.WA8FSD/app/build/outputs/apk/debug/app-debug.apk
apksigner verify --verbose --print-certs \
  /tmp/ooro-deviceos-testapp.WA8FSD/app/build/outputs/apk/debug/app-debug.apk
adb -s 16301675CN011643 shell pm list packages | rg 'com.ooro.deviceostest'
adb -s 16301675CN011643 shell pm path com.ooro.deviceostest
adb -s 16301675CN011643 shell dumpsys package com.ooro.deviceostest \
  | rg 'versionCode|versionName|apkSigningVersion'
```

The successful run used a clean harmless test artifact with no `REQUEST_INSTALL_PACKAGES` or boot permissions. The first Agent-shaped test artifact was blocked by Google Play Protect and was not bypassed. The Agent was updated only with development APKs; no production signing key, production API, production storage, reset, reboot, Screen Player uninstall, or Device Owner change was used.

Repository changes that enabled this result:

- `MainActivity`/`InstallResultReceiver`: foreground-safe PackageInstaller approval handoff for Android 15 background activity restrictions.
- `AndroidManifest.xml`: launcher package visibility query for independent managed-app version/signature checks.
- `WorkScheduler`: `NetworkType.NOT_REQUIRED` only for debug builds pointed at `http://127.0.0.1`; release builds retain `NetworkType.CONNECTED`.
- `ApkInstaller.kt` and `DeviceOsApi.kt`: mutable PackageInstaller callback and complete-file retry handling.

Disposition: **PASS for the harmless observation-mode application deployment path; NOT TESTED for production OTA, S3-backed storage, Device Owner silent installation, Lock Task, or Screen Player lifecycle.**

### H. Sprint 3 unattended OTA readiness — 2026-10-21

#### Update acceptance status

The TECNO KN3 was already at `com.ooro.deviceostest` version `3.0.0`, version code `3`, before this Sprint 3 retry. The disposable database contained the v3 target and a real prior healthy attempt:

```text
Target: 0970335a-b025-43c2-b262-dc8ce97650b4
Attempt: 1
State: HEALTHY
bytesDownloaded=2838050
checksumVerified=true
installerSessionId=16145361
```

Read-only device evidence:

```bash
adb -s 16301675CN011643 shell dumpsys package com.ooro.deviceostest \
  | rg 'versionCode|versionName|firstInstallTime|lastUpdateTime'
```

```text
versionCode=3
versionName=3.0.0
firstInstallTime=2026-10-21 03:24:04
lastUpdateTime=2026-10-21 03:33:11
installerPackageName=com.ooro.deviceagent
```

A marker was written to the existing app-private `files/` directory without clearing application data:

```text
sprint3-marker-v2-preserved
```

The agent reconciled the existing v3 target without creating a new attempt or changing the APK update time. The marker remained readable and the target remained `HEALTHY|attemptCount=0`:

```text
before target: HEALTHY|0|2026-10-20 22:03:12.415
after target:  HEALTHY|0|2026-10-20 22:03:12.415
before APK update: 2026-10-21 03:33:11
after APK update:  2026-10-21 03:33:11
marker before/after: sprint3-marker-v2-preserved
```

Disposition: **PASS for v3 healthy reconciliation and duplicate-install suppression. NOT TESTED for physical v2-created-marker preservation.** The device was already v3 at the start of this retry, so a downgrade/reinstall was not performed and no claim is made that this run proves the v2-to-v3 data-preservation criterion.

#### Private S3/R2 storage

The adapter is implemented in `apps/api/src/domain/deviceos-storage.ts` using private S3 `PutObject`, `GetObject`, `DeleteObject`, and expiring signed `GetObject` URLs. The repository has no authorized R2/S3 credentials in the environment:

```text
DEVICEOS_STORAGE_MODE: unset
DEVICEOS_S3_BUCKET: unset
DEVICEOS_S3_ENDPOINT: unset
DEVICEOS_S3_ACCESS_KEY_ID: unset
DEVICEOS_S3_SECRET_ACCESS_KEY: unset
```

Result: **BLOCKED — private cloud storage acceptance not executed.** No public bucket or production credential was used. Exact disposable R2 configuration is:

```bash
export DEVICEOS_STORAGE_MODE=s3
export DEVICEOS_S3_BUCKET=<private-test-bucket>
export DEVICEOS_S3_REGION=auto
export DEVICEOS_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
export DEVICEOS_S3_ACCESS_KEY_ID=<scoped-test-token-access-key>
export DEVICEOS_S3_SECRET_ACCESS_KEY=<scoped-test-token-secret>
```

Create a bucket with public access disabled, create a token restricted to that bucket with object read/write/delete only, start the API with the variables above, upload the APK through the existing release endpoint, and test the signed URL at its configured expiry. Verify an unsigned URL and a different-bucket key return authorization/not-found errors. Keep all values outside the repository.

#### Dedicated Device Owner hardware

Result: **NOT TESTED / operator authorization required.** No provisioning, reset, reboot, owner-state change, or Lock Task change was attempted on TECNO KN3. A separate company-owned disposable motherboard is required. The procedure must use Android Enterprise provisioning or an authorized ADB provisioning path, then verify `dpm get-device-owner`, the DeviceOS/Screen Player Lock Task allowlist, silent install/update behavior, reboot recovery, kiosk resumption, and post-reboot heartbeat. Firmware restrictions must be reported rather than bypassed.

#### Screen Player safety

Result: **NOT TESTED in Sprint 3.** Screen Player remained installed and was not uninstalled, cleared, reset, or modified. Campaign continuity, cached creatives, proof-of-play continuity, kiosk continuity, and playback-health discrimination require a separate authorized acceptance run.

#### Exact commands executed

```bash
adb devices -l
adb -s 16301675CN011643 shell pm list packages
adb -s 16301675CN011643 shell dumpsys package com.ooro.deviceostest
adb -s 16301675CN011643 shell run-as com.ooro.deviceostest mkdir files
adb -s 16301675CN011643 shell run-as com.ooro.deviceostest cat files/sprint3-marker.txt
adb -s 16301675CN011643 reverse tcp:8080 tcp:8080
adb -s 16301675CN011643 shell am start -n com.ooro.deviceagent/.MainActivity
PGHOST=/tmp PGPORT=55446 PGDATABASE=ooro_test PGUSER=ooro psql ...
```

Disposable PostgreSQL was run on `127.0.0.1:55446` with a Unix socket under `/tmp`; the API used `DATABASE_URL` for that database, local disposable storage under `/tmp/ooro-deviceos-hw-storage.04b26A`, and ADB reverse forwarding. The API, database, and reverse tunnel were stopped/removed after the run. No production resources were changed.

#### Sprint 3 milestone summary

| Milestone | Result |
|---|---|
| v3 package prepared with higher version code and same certificate | PASS — prior artifact/evidence |
| v3 pipeline target reaches HEALTHY | PASS |
| Duplicate reconciliation avoids reinstall | PASS |
| v2-created marker survives physical v2→v3 update | NOT TESTED — device already v3 |
| Private R2/S3 acceptance | BLOCKED — credentials unavailable |
| Unattended Device Owner installation | NOT TESTED — separate hardware/authorization required |
| Screen Player continuity | NOT TESTED |
| Fleet rollout readiness | BLOCKED |

### I. Sprint 3 physical v3-to-v4 upgrade retry — 2026-10-21

#### Precondition and supported marker check

The TECNO KN3 was verified before any update action:

```text
package: com.ooro.deviceostest
versionCode=3
versionName=3.0.0
firstInstallTime=2026-10-21 03:24:04
lastUpdateTime=2026-10-21 03:33:11
installerPackageName=com.ooro.deviceagent
Screen Player: installed
```

The installed v3 application was inspected for a supported test interface. Its `MainActivity` provides enrollment and credential rotation only; it has no marker-generation, marker-read, exported test intent, content provider, or test-only API. The existing shell-created `files/sprint3-marker.txt` is therefore not valid evidence for this acceptance and was not used to claim preservation.

Result: **BLOCKED at the marker precondition.** The v3 app must first expose an authorized, application-supported marker interface, or provide a test build with that interface installed before the v3 baseline is established. Adding the interface only to v4 would not prove that v3 created the marker.

#### v4 artifact preparation (not installed)

The harmless test artifact was built outside the repository without changing production code or device state:

```bash
apps/screen-android/gradlew \
  -p /tmp/ooro-deviceos-testapp.WA8FSD \
  -PdeviceVersionCode=4 -PdeviceVersionName=4.0.0 \
  assembleDebug --no-daemon

sha256sum /tmp/ooro-deviceos-testapp.WA8FSD/app/build/outputs/apk/debug/app-debug.apk
aapt2 dump badging /tmp/ooro-deviceos-testapp.WA8FSD/app/build/outputs/apk/debug/app-debug.apk
apksigner verify --verbose --print-certs \
  /tmp/ooro-deviceos-testapp.WA8FSD/app/build/outputs/apk/debug/app-debug.apk
```

Evidence:

```text
BUILD SUCCESSFUL
packageName=com.ooro.deviceostest
versionCode=4
versionName=4.0.0
SHA-256=7a4d06f74f0e68cf95c3d74bccb8578f085d11734aabacb2eeee72af81c20c81
APK Signature Scheme v2=true
certificate SHA-256=b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33
```

The v4 APK was **NOT INSTALLED**, not uploaded, and not assigned because the supported v3 marker precondition failed. This preserves the current v3 baseline and avoids an unprovable OTA result.

#### Stage result

| Stage | Result |
|---|---|
| Verify v3 installed | PASS |
| Generate marker through supported v3 interface | BLOCKED — interface missing |
| Verify supported marker persistence | NOT TESTED |
| Build compatible v4 | PASS |
| Verify v4 can read marker | BLOCKED — v4 test interface absent and v3 marker invalid |
| Disposable backend/storage setup | NOT TESTED for v4 |
| Upload/approve/assign v4 | NOT TESTED |
| Physical DeviceOS v3→v4 installation | NOT TESTED |
| Independent v4 verification | NOT TESTED |
| Exact marker comparison | NOT TESTED |
| Backend HEALTHY for v4 | NOT TESTED |
| Duplicate reconciliation after v4 | NOT TESTED |
| Screen Player untouched | PASS — package remained installed; no update action taken |
| Physical OTA acceptance | BLOCKED |

No downgrade, uninstall, clear-data, reboot, reset, Device Owner change, production access, or unrelated-service shutdown was performed. Production cloud storage and dedicated Device Owner acceptance remain separate BLOCKED/NOT TESTED milestones.

### J. Authorized physical v3-to-v4 OTA attempt — 2026-10-21

#### Preflight evidence

```bash
adb devices -l
adb -s 16301675CN011643 shell getprop ro.product.model
adb -s 16301675CN011643 shell getprop ro.product.device
adb -s 16301675CN011643 shell dumpsys package com.ooro.deviceostest
adb -s 16301675CN011643 shell dumpsys package com.ooro.deviceagent
adb -s 16301675CN011643 shell dumpsys package com.ooro.screenplayer
adb -s 16301675CN011643 shell dpm list-owners
git status --short
git diff --check
```

Observed baseline:

```text
Device: TECNO KN3 / TECNO-KN3
Test app: com.ooro.deviceostest, versionCode=3, versionName=3.0.0
Test app firstInstallTime: 2026-10-21 03:24:04
Test app lastUpdateTime: 2026-10-21 03:33:11
DeviceOS Agent: versionCode=8, versionName=0.8.0
Screen Player: versionCode=1, versionName=0.1.0
Device Owner: no owners
Test-app installer: com.ooro.deviceagent
Test-app signing certificate SHA-256: b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33
```

The development signing keystore was present outside the repository at `/home/varneeth/.android/debug.keystore`. Existing uncommitted work was preserved and `git diff --check` passed.

#### Marker prerequisite

The installed v3 application was inspected in its source and manifest. Its only supported application UI/API is enrollment and credential rotation. There is no supported marker-write/read interface, exported test intent, content provider, or test-only endpoint. The prior shell-created marker is not valid for this procedure and was not read or used as evidence.

Result: **BLOCKED — missing supported v3 marker interface.** Per procedure, no application data was modified, no marker was generated, and no v4 installation was attempted.

#### Stage results

| Stage | Result |
|---|---|
| TECNO KN3 connected | PASS |
| v3 baseline verified | PASS |
| Agent installed | PASS |
| Screen Player installed | PASS |
| Device Owner inactive | PASS — `dpm list-owners` returned `no owners` |
| Signing keystore outside repository | PASS |
| Working tree preserved | PASS |
| Supported v3 marker generation | BLOCKED |
| Marker read-back | NOT TESTED |
| v4 build/upload/assignment | NOT TESTED |
| DeviceOS v3→v4 OTA | NOT TESTED |
| v4 independent verification | NOT TESTED |
| Cross-version private-data preservation | NOT TESTED |
| Duplicate reconciliation after v4 | NOT TESTED |
| Screen Player safety | PASS — no update action was taken; package remained installed |
| Private cloud storage | BLOCKED — no authorized private credentials |
| Silent Device Owner installation | NOT TESTED |
| Fleet production readiness | BLOCKED |

No downgrade, uninstall, clear-data, reboot, reset, Device Owner change, APK assignment, production service access, or production credential use occurred during this attempt. A supported marker interface must be added to the v3 test artifact and installed as a new authorized baseline before repeating the v3→v4 physical acceptance.

### K. Physical v3 → v4 → v5 OTA Data Preservation Acceptance — 2026-10-21

#### Marker interface implementation

The harmless test application was modified only in a disposable source copy at `/tmp/ooro-deviceos-testapp-s3.a7Ihun`; repository DeviceOS production sources were not changed for this feature. `TestMarkerStore` uses app-private `SharedPreferences` named `deviceos_test_marker` and key `marker_uuid`.

Implementation guarantees:

- UUID generation occurs inside the application process using `UUID.randomUUID()`.
- `createIfAbsent()` returns the existing marker and never overwrites it.
- Persistence uses synchronous `SharedPreferences.commit()` so the test can verify storage before an update.
- `read()` is read-only and does not modify storage.
- Normal startup does not create or overwrite a marker.
- The interface is available only when `BuildConfig.DEBUG` is true, through buttons in the app's own activity UI; no marker component, provider, or unrestricted external interface was added.
- v5 uses the same marker preference name/key and migration-free code path as v4.

The local unit test validates UUID marker format. Android process-restart persistence and cross-version retention require the authorized physical v4→v5 run and are not claimed from source tests.

Result: **PASS for implementation/build preparation; NOT TESTED physically.**

#### v4/v5 build evidence

Commands executed:

```bash
apps/screen-android/gradlew \
  -p /tmp/ooro-deviceos-testapp-s3.a7Ihun \
  testDebugUnitTest assembleDebug \
  -PdeviceVersionCode=4 -PdeviceVersionName=4.0.0 --no-daemon

apps/screen-android/gradlew \
  -p /tmp/ooro-deviceos-testapp-s3.a7Ihun \
  testDebugUnitTest assembleDebug \
  -PdeviceVersionCode=5 -PdeviceVersionName=5.0.0 --no-daemon

apps/screen-android/gradlew \
  -p /tmp/ooro-deviceos-testapp-s3.a7Ihun \
  assembleRelease \
  -PdeviceVersionCode=5 -PdeviceVersionName=5.0.0 \
  -PdeviceApiBaseUrl=https://example.invalid --no-daemon
```

Both debug build/test runs and the minified release build completed successfully. APK verification:

```text
v4 package: com.ooro.deviceostest
v4 versionCode/versionName: 4 / 4.0.0
v4 SHA-256: 50f461a42c57fa598363757de8f425ddc1877ddfe3f49e55c570de24c78e1761
v4 certificate SHA-256: b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33

v5 package: com.ooro.deviceostest
v5 versionCode/versionName: 5 / 5.0.0
v5 SHA-256: c02742c629139a68629008e2b3588056119aecabfb651c5c75ba46506a7c5d39
v5 certificate SHA-256: b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33

v4/v5 APK Signature Scheme v2: true
API compatibility: minSdk=26, targetSdk=35, compileSdk=35
```

The release build was unsigned because no production release credential was supplied; the debug artifacts use development signing material outside the repository. No signing credential was committed. The minified release APK contained no marker UI strings, supporting the debug-only exposure requirement.

#### Physical acceptance procedure prepared, not executed

1. Start disposable PostgreSQL/API/local private storage and apply migrations only to that database.
2. Register and approve the v4 APK, target only the enrolled TECNO KN3, and let DeviceOS perform download, checksum/signature validation, PackageInstaller approval, and reconciliation.
3. Open the v4 app's debug-only `Create/read test marker` control, record the UUID in redacted evidence, force-stop/start the app, and use `Read test marker` to confirm the same value.
4. Register and approve v5 with the same package/certificate and target only the TECNO KN3.
5. Complete the DeviceOS v4→v5 update with normal Android approval, independently verify version code 5, read the marker through the v5 interface, and compare the exact UUID.
6. Confirm backend `HEALTHY`, no duplicate install attempt after reconciliation, unchanged Screen Player package/version/install timestamp, Agent operation, and no Device Owner.
7. Stop only the disposable API/database/storage and ADB tunnel.

Pre-authorization status before this run:

```text
Physical v3→v4 install: NOT TESTED — explicit revised-procedure approval required
Marker creation/read in v4: NOT TESTED — explicit revised-procedure approval required
Physical v4→v5 upgrade: NOT TESTED — explicit revised-procedure approval required
Cross-version marker preservation: NOT TESTED — must be proven on hardware
Screen Player/Agent integrity: NOT TESTED for this two-update procedure
Private cloud storage: BLOCKED — no authorized credentials
Silent Device Owner installation: NOT TESTED
Production/fleet readiness: NOT READY
```

No APK was installed, no application data was modified, and no disposable services or ADB tunnels were started during the pre-authorization preparation above.

#### Authorized physical execution evidence

The operator authorized the two non-destructive test-app updates. No Screen Player, Agent, Device Owner, or production resource was modified.

Device and baseline:

```text
serial=16301675CN011643
model=TECNO_KN3
androidApi=35
Device Owner=no owners
v3 versionCode=3, versionName=3.0.0
v3 lastUpdateTime=2026-10-21 03:33:11
Screen Player versionCode=1, versionName=0.1.0
Screen Player firstInstallTime=2026-09-17 18:46:16
Screen Player lastUpdateTime=2026-10-20 00:53:47
Agent versionCode=8, versionName=0.8.0
```

Prepared APK verification:

```text
v4 package=com.ooro.deviceostest versionCode=4 versionName=4.0.0
v4 SHA-256=50f461a42c57fa598363757de8f425ddc1877ddfe3f49e55c570de24c78e1761
v4 certificate=b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33
v5 package=com.ooro.deviceostest versionCode=5 versionName=5.0.0
v5 SHA-256=c02742c629139a68629008e2b3588056119aecabfb651c5c75ba46506a7c5d39
v5 certificate=b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33
```

DeviceOS deployment transitions for both targets were independently recorded:

```text
ASSIGNED → DOWNLOADING → DOWNLOADED → VERIFIED → INSTALLING
→ PENDING_USER_ACTION → INSTALLED → HEALTH_CHECK → HEALTHY
```

v4 target `22af8ce0-0ecb-4099-a4bf-d80a2d6309ab`:

```text
bytesDownloaded=2841310
checksumVerified=true
installerStatus=HEALTHY
installedVersionCode=4
healthyAt=2026-10-20 22:40:36.509
```

The v4 debug-only interface generated and stored this UUID from the application process:

```text
v4 marker=6089dcc1-04a9-4815-b646-8eb96b8793f7
v4 immediate readback=6089dcc1-04a9-4815-b646-8eb96b8793f7
v4 process-restart readback=6089dcc1-04a9-4815-b646-8eb96b8793f7
```

v5 target `1c76b73a-68e7-462e-8fad-93cf46c7dd13`:

```text
bytesDownloaded=2841310
checksumVerified=true
installerStatus=HEALTHY
installedVersionCode=5
healthyAt=2026-10-20 22:42:02.037
v5 marker readback=6089dcc1-04a9-4815-b646-8eb96b8793f7
marker exact-match=true
```

Final independent device evidence:

```text
com.ooro.deviceostest versionCode=5 versionName=5.0.0
lastUpdateTime=2026-10-21 04:12:01
installerPackageName=com.ooro.deviceagent
com.ooro.screenplayer versionCode=1 versionName=0.1.0
com.ooro.screenplayer firstInstallTime=2026-09-17 18:46:16
com.ooro.screenplayer lastUpdateTime=2026-10-20 00:53:47
com.ooro.deviceagent versionCode=8 versionName=0.8.0
Device Owner=no owners
```

Idempotent reconciliation evidence:

```text
v5 target before=HEALTHY|attemptCount=0
v5 target after=HEALTHY|attemptCount=0
DeploymentAttempt before=1|maxAttemptNumber=1|HEALTHY
DeploymentAttempt after=1|maxAttemptNumber=1|HEALTHY
APK lastUpdateTime before=2026-10-21 04:12:01
APK lastUpdateTime after=2026-10-21 04:12:01
v5 marker after reconciliation=6089dcc1-04a9-4815-b646-8eb96b8793f7
```

Final physical result:

| Acceptance item | Result |
|---|---|
| Physical v3 → v4 DeviceOS OTA | PASS |
| v4 marker creation/readback | PASS |
| v4 → v5 DeviceOS OTA | PASS |
| Cross-version private-data preservation | PASS — exact UUID match through v4 process restart and v5 update |
| Backend HEALTHY and installation receipts | PASS |
| Duplicate reconciliation | PASS |
| Screen Player unchanged | PASS — package/version/install timestamps unchanged; no playback interruption was requested |
| DeviceOS Agent operational | PASS — post-update heartbeat recorded, version unchanged |
| Device Owner unchanged | PASS — no owners |
| Private cloud storage | BLOCKED — local private storage only; no authorized R2 credentials |
| Silent Device Owner installation | NOT TESTED |
| Fleet production readiness | NOT READY |

The disposable API, PostgreSQL cluster, local private storage directory, and ADB reverse tunnel used for this acceptance were stopped/removed after evidence capture. No test application was uninstalled and no application data was cleared.

Exact physical-run commands included:

```bash
adb -s 16301675CN011643 reverse tcp:8080 tcp:8080
adb -s 16301675CN011643 shell am start -n com.ooro.deviceagent/.MainActivity
adb -s 16301675CN011643 shell am start -n com.ooro.deviceostest/com.ooro.deviceagent.MainActivity
adb -s 16301675CN011643 shell uiautomator dump /sdcard/ooro-v4-ui.xml
adb -s 16301675CN011643 shell input tap 800 494
adb -s 16301675CN011643 shell input tap 800 578
adb -s 16301675CN011643 shell am force-stop com.ooro.deviceostest
adb -s 16301675CN011643 shell input tap 1050 560
adb -s 16301675CN011643 shell dumpsys package com.ooro.deviceostest
adb -s 16301675CN011643 shell pm path com.ooro.deviceostest
adb -s 16301675CN011643 shell dpm list-owners
```

Disposable infrastructure commands included:

```bash
/usr/lib/postgresql/16/bin/initdb -D /tmp/ooro-deviceos-sprint4-pg.Y1Vb6S --auth=trust --no-locale --encoding=UTF8
/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/ooro-deviceos-sprint4-pg.Y1Vb6S \
  -o '-p 55447 -h 127.0.0.1 -k /tmp' -w start
DATABASE_URL='postgresql://varneeth@127.0.0.1:55447/ooro_test?schema=public' \
  pnpm --filter @ooro/api exec prisma migrate deploy
DATABASE_URL='postgresql://varneeth@127.0.0.1:55447/ooro_test?schema=public' \
  DEVICEOS_STORAGE_MODE=local \
  DEVICEOS_STORAGE_DIR=/tmp/ooro-deviceos-sprint4-storage.Yg8vGD \
  pnpm --filter @ooro/api start
/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/ooro-deviceos-sprint4-pg.Y1Vb6S -m fast -w stop
adb -s 16301675CN011643 reverse --remove tcp:8080
```

#### Repeated-procedure guard — 2026-10-21

A later invocation of the v3→v4→v5 procedure was stopped at preflight because the actual TECNO state is already:

```text
com.ooro.deviceostest versionCode=5 versionName=5.0.0
lastUpdateTime=2026-10-21 04:12:01
```

The v4/v5 artifacts still match their recorded package, version, certificate, and SHA-256 values. Screen Player remains version `0.1.0` with unchanged installation/update timestamps; DeviceOS Agent remains version `0.8.0`; `dpm list-owners` reports `no owners`; and the working tree remains preserved with `git diff --check` passing. No downgrade, reinstall, infrastructure startup, ADB reverse tunnel, or application-data operation was performed for this repeat invocation.

Result for the repeated invocation: **SKIPPED — ALREADY SATISFIED**. This is not a regression. The previously recorded physical v3→v4→v5 acceptance evidence remains the authoritative result; a safe follow-up would require a concrete regression requirement and a new higher-version test sequence, not a downgrade.

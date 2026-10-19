# OORO DeviceOS Sprint 2 Acceptance Report

Date: 2026-10-16
Environment: `/home/varneeth/Documents/oodo`
Scope: validation only; no production database, bucket, fleet, Device Owner state, or installed application was changed.

## Executive result

Hardware-independent checks, isolated PostgreSQL acceptance, local private-storage release acceptance, and controlled test signing now pass. Live S3, agent-on-device, and Device Owner acceptance remain blocked by unavailable disposable S3 infrastructure or required operator authorization. Device Owner and silent-install capability are **not established**.

Production fleet rollout recommendation: **DO NOT APPROVE** until the blocked gates below are completed on disposable infrastructure and a dedicated authorized test device.

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

### C. Android observation mode

**NOT TESTED.** Fresh read-only evidence: ADB state `device`; model `TECNO KN3`; API 35; Screen Player installed; DeviceOS Agent absent; `Device Owner Type: -1`. Installation, enrollment, heartbeat, inventory, download, PackageInstaller handling, logs, and backend receipts remain pending explicit operator authorization.

### D. Dedicated-device acceptance

**NOT TESTED / BLOCKED pending authorization.** The dedicated-device procedure and receiver component are documented above. No provisioning, reset, owner change, reboot, uninstall, or APK install was performed. Silent installation, Lock Task, reboot/offline recovery, application-data preservation, and advertisement/proof-of-play continuity therefore have no hardware PASS evidence.

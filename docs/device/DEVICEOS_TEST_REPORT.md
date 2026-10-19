# OORO DeviceOS Sprint 1 Test Report

Date: 2026-10-16

This report reflects the current checkout. `NOT TESTED` means the required runtime, infrastructure, signed artifact, or physical hardware was not available; it is not treated as a pass.

## Automated checks

| Requirement | Result | Evidence |
| --- | --- | --- |
| Application registration and duplicate package protection | PASS (code/integration gated) | `apps/api/src/server.ts`; `deviceos.integration.test.ts` |
| Duplicate immutable release handling | PASS | `apk-release.test.ts`; real-APK release integration is opt-in |
| Invalid APK metadata rejection | PASS | `apk-release.test.ts` |
| Signing-certificate continuity | PASS | `apk-release.test.ts` |
| SHA-256 and package validation | PASS (code) | `apk-release.ts`; Android `validateApk` |
| Unauthorized upload and admin mutation rejection | PASS (code/tests) | admin-role tests and authenticated routes |
| Cross-device credential/target scoping | NOT TESTED (latest PostgreSQL run) | Gated by `OORO_DEVICEOS_INTEGRATION_TESTS=true` |
| Expired and revoked credentials | PASS (code; integration gated) | `authenticateDeviceOs`; gated integration assertions |
| Replay protection and duplicate commands | PASS (domain; integration gated) | request receipts, event idempotency, deployment idempotency tests |
| Deterministic deployment targeting | PASS | `deviceos.test.ts` |
| SDK incompatibility and downgrade prevention | PASS | backend and Android policy tests |
| Interrupted/resumable downloads | PASS (policy/code) | Android range tests and `DeviceOsApi.download` |
| Offline reconnection and retry recovery | PASS (policy/code) | Android retry and WorkManager reconciliation tests |
| Installation state transitions | PASS | backend transition tests and Android installer policy tests |
| Pending user action | PASS (policy/code) | `ApkInstallerPolicyTest`; backend transition tests |
| Failed installation recovery | PASS (policy/code) | restart/retry tests |
| Paused campaign behavior | PASS (policy/code) | paused campaign deferral and backend pause logic |
| Application allowlist enforcement | PASS (code; integration gated) | allowlist endpoint, state/download filtering, gated integration assertions |
| API build and Prisma validation | PASS | `pnpm --filter @ooro/api build`; `prisma validate` |
| Web typecheck and production build | PASS | `pnpm typecheck`; `pnpm build` |
| Android debug and release compilation | PASS | Gradle `testDebugUnitTest assembleDebug assembleRelease` |

## Runtime acceptance

| Requirement | Result | Evidence / limitation |
| --- | --- | --- |
| Disposable PostgreSQL migration and HTTP integration | NOT TESTED | Docker daemon and local PostgreSQL binaries unavailable; production was not touched |
| Private S3-compatible upload/download acceptance | NOT TESTED | No test bucket or credentials supplied |
| Real signed release artifact | NOT TESTED | Repository release APK is unsigned |
| Device enrollment on hardware | NOT TESTED | Agent is not installed on the connected device |
| Remote APK installation on hardware | NOT TESTED | Requires development API, signed APK, and device execution |
| Existing application data preservation | NOT TESTED | Requires hardware installation/update |
| Multiple application installation | NOT TESTED | Requires hardware execution |
| Restart and offline recovery on target OEM | NOT TESTED | Requires hardware execution |
| Advertisement playback/proof-of-play continuity | NOT TESTED | Requires target Screen Player hardware |
| Device Owner silent installation | NOT TESTED | No Device Owner provisioning or ownership mutation performed |

## Commands

```bash
pnpm --filter @ooro/api test
pnpm --filter @ooro/api build
pnpm typecheck
pnpm build
bash scripts/deviceos-postgres-integration.sh  # requires Docker; disposable DB only
cd apps/deviceos-android
../screen-android/gradlew testDebugUnitTest assembleDebug assembleRelease \
  -PdeviceApiBaseUrl=https://deviceos.invalid
```

The connected Android device was inspected read-only: TECNO KN3, Android API 35, existing `com.ooro.screenplayer`, no Device Owner, and no `com.ooro.deviceagent` installation.

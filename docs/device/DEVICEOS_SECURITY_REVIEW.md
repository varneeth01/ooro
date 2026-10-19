# OORO DeviceOS Sprint 1 Security Review

## Scope

This review covers the Sprint 1 backend registry, APK release path, deployment state API, private artifact delivery, admin proxy, and non-owner Android agent. It does not certify a production cloud bucket, a production signing pipeline, Device Owner provisioning, or OEM-specific Android behavior.

## Threat model

The update path is treated as a fleet-wide code-execution boundary. The relevant threats are:

- An unauthorized administrator registering or deploying an application.
- A device credential being copied, replayed, expired, or revoked.
- A device receiving another device's release or command.
- An attacker replacing an APK, changing its package identity, or changing its signing certificate.
- A duplicate or concurrent request causing a release, deployment, or installation state to be applied twice.
- A compromised device reporting false installation or health results.
- Artifact storage or download URLs becoming publicly reusable.
- A rollout failure affecting active Screen Player playback.

## Implemented controls

| Threat | Control | Sprint 1 evidence |
| --- | --- | --- |
| Unauthorized admin mutation | Existing admin authentication plus DeviceOS write-role allowlist (`ADMIN`, `SUPER_ADMIN`, `OPERATIONS`) | `admin-auth.test.ts`, authenticated admin routes |
| Unauthorized application delivery | Registered applications are explicitly allowlisted; authorized blocking is audited and blocks desired-state and APK download access | Application allowlist endpoint, gated PostgreSQL integration assertions |
| Credential exposure | Per-device random credential; SHA-256 hash at rest; Android Keystore-backed token storage; explicit rotation and revocation | DeviceOS integration test and Android agent source |
| Cross-device access | Every device query and event is constrained by the authenticated managed-device ID | Scoped API implementation and gated PostgreSQL integration test |
| APK substitution | SHA-256, package name, version, minSdk, targetSdk, and signing-certificate checks | `apk-release.test.ts`; real APK release integration |
| Incompatible assignment or false health | Server filters known SDK/version-incompatible targets; `HEALTHY` receipts require matching version, certificate, and health marker | DeviceOS domain tests; expanded PostgreSQL route test is gated pending a fresh disposable run |
| Signing continuity | Backend rejects certificate changes within an application release lineage | `assertSigningCertificateContinuity` tests |
| Artifact leakage | Private local storage or S3-compatible storage; five-minute HMAC/presigned URLs; no storage credentials on devices | Storage unit tests and release integration |
| Replay/idempotency | One-time pairing consumption, seven-day configurable per-device request receipts, deployment idempotency keys, durable event idempotency, optimistic target row versions | DeviceOS domain tests; PostgreSQL replay assertion is gated |
| Rollout blast radius | Explicit target selection, deterministic cohorts, health gates, durable pause/resume, bounded retries | Deployment domain tests |
| Player disruption | Screen Player updates require an explicit maintenance window; no uninstall or factory-reset endpoint exists | Deployment implementation and hardware checklist |
| Privilege escalation | Observation mode never assigns Device Owner, enables Lock Task, or claims silent installation | Android manifest, receiver, and README |

## Residual risks and required production gates

1. Release signing keys are not present in the repository and must remain in a protected signing pipeline. The generated release APK is unsigned.
2. S3-compatible storage must be private, enforce server-side encryption and lifecycle policy, and be acceptance-tested with the production IAM role before rollout.
3. Device credentials are bearer credentials. TLS, certificate validation, short expiry/rotation policy, and revocation monitoring are required in deployment configuration.
4. A compromised agent can falsify telemetry or health reports. Server-side health gates should use independent signals where possible, and suspicious devices should be quarantined.
5. Silent installation is not available in observation mode. Device Owner provisioning and OEM policy behavior require a separately authorized hardware procedure.
6. Rollback is not implemented as an automatic APK downgrade. Recovery must use a separately approved release and a new deployment campaign.
7. Physical playback continuity, pending proof-of-play preservation, reboot recovery, and OEM background-execution behavior remain untested.

## Security acceptance decision

The hardware-independent Sprint 1 controls are implemented and covered by unit/build evidence. The latest PostgreSQL integration suite is gated because disposable PostgreSQL is unavailable in the current environment. The system is **not approved for production fleet rollout** until the database integration, production signing/storage gates, and hardware acceptance checklist in `DEVICEOS_SPRINT1.md` are completed.

# OORO DeviceOS Sprint 1 Operations Runbook

## Configuration

Production API startup requires:

- `DEVICEOS_STORAGE_MODE=s3`
- A private `DEVICEOS_S3_BUCKET`
- A configured region/endpoint and server-side cloud credentials or workload identity
- `DEVICEOS_AAPT2_PATH` and `DEVICEOS_APKSIGNER_PATH` available to the API
- `DEVICEOS_DOWNLOAD_BASE_URL` configured only when local development storage is used
- A strong production `JWT_SECRET`

Android devices receive only their device credential. They never receive S3 credentials, signing keys, or a reusable storage secret.

Device mutation request receipts are retained for seven days by default (`DEVICEOS_REQUEST_RECEIPT_RETENTION_DAYS`). This bounds replay protection storage while covering delayed/retried heartbeat requests; increase the window only with an explicit storage and threat-model review.

## Release procedure

1. Register the exact Android package name under `/admin/deviceos/applications`.
2. Upload the signed APK under `/admin/deviceos/releases`.
3. Confirm package name, version code/name, minSdk, targetSdk, SHA-256, and certificate digest.
4. Approve the immutable release using an authorized operations role.
5. Keep the release in draft until the signing and compatibility review is complete.

An identical release upload is idempotent. A changed certificate, package, or incompatible APK is rejected. Do not overwrite objects manually.

## Rollout procedure

1. Enroll and verify one development device using the existing display pairing flow.
2. Create an individual-device campaign and observe every state transition.
3. Use a percentage campaign for canary expansion with explicit failure and health thresholds.
4. Pause the campaign immediately if installation failures, health failures, or playback symptoms exceed the configured gate.
5. Resume only after reviewing target logs and the affected release.
6. Expand to the remaining fleet only after the canary is healthy.

The backend excludes known-incompatible enrolled devices during campaign creation. Devices with missing capability data are not silently treated as incompatible; the agent performs the final SDK, package, signature, and downgrade checks before installation.
The admin deployment form preserves its idempotency key across retryable network failures, but rotates it after a validation or conflict response so corrected input represents a new deployment intent.

Screen Player updates must include a bounded maintenance window. Outside that window the agent leaves the existing player installed and reports no successful update.

## Device incident response

### Credential compromise

1. Revoke the managed device from `/admin/deviceos/devices`.
2. Confirm subsequent state and heartbeat requests return unauthorized.
3. Preserve the audit event and deployment history.
4. Re-enroll only after the physical device and pairing workflow are verified.

### Failed installation

1. Inspect the latest attempt and installation result.
2. Confirm the current installed package was not downgraded or uninstalled.
3. Check storage, checksum, package identity, certificate, and pending-user-action status.
4. Allow bounded retries only when the failure is understood.
5. Quarantine the target or pause the campaign for repeated or critical failures.

### Suspected fleet-wide release problem

1. Pause the campaign.
2. Do not delete the immutable release or its audit records.
3. Preserve device proof-of-play and heartbeat data.
4. Prepare a corrected, newly signed release with a higher version code.
5. Deploy the correction as a new staged campaign after canary review.

## Observability and audit

Review:

- Device last-seen time, enrollment status, capabilities, and telemetry.
- Deployment target state, attempt count, retry time, installer result, and health result.
- DeviceOS audit events for enrollment, credential rotation/revocation, release approval, deployment creation, pause/resume, and device-reported state.
- Storage and signing-tool failures in API logs.

The admin UI must show “no data” when no device has reported telemetry; it must not synthesize online, installed, or healthy statuses.

## Unsupported operations

Sprint 1 does not provide remote shell execution, arbitrary script execution, factory reset, automatic APK downgrade, automatic uninstall of Screen Player/DeviceOS Agent, or automatic rollback claims. These require separate authorization and design review.

# OORO Layout Studio V1 — rollout and compatibility

## Implementation boundary

This feature is a separate integration branch stacked on `fix/screen-fit-thermal` (PR #58), because the locked Standard preview uses the V3 layout contract from that branch. This PR must target `fix/screen-fit-thermal`; it must not merge or modify PR #58.

Layout Studio V1 provides an authenticated Standard preview and Custom draft editor, versioned normalized contract validation, persistent draft rows, immutable published revision snapshots, role checks, optimistic revision checks and audit events. Publishing a revision only publishes a presentation contract to the catalog. It does **not** approve, schedule or authorize advertising content.

The device assignment endpoint is hard-disabled in this release and always returns `LAYOUT_ASSIGNMENT_DISABLED`. There is no environment override. Assignment must not be enabled until the Android native interpreter, capability evidence, staged delivery, rollback and device acceptance work is complete. Existing V1/V2/V3 rendering and assignments are not migrated or changed.

## Standard geometry

Standard V3 is locked and resolves normalized coordinates at the target resolution. At 1280×720 it produces main 1024×612, sponsor 1024×108, QR/offer 256×360 and navigation 256×360. Its preview is visual-only. It has no access to ad impression or proof endpoints.

## Custom contract

The editor persists schema version 1 with normalized zones, whitelisted widget types, explicit FIT/CENTER_CROP behavior, content reference IDs and hardware profile labels. API validation rejects out-of-bounds zones, unsupported schema values, invalid bindings and collisions outside supported static overlays. The declared hardware profiles are not certifications: because verified capability budgets are not yet registered, Custom drafts remain editable and previewable but fail validation/publication until the target profile's limits have test evidence. No arbitrary decoder or widget count is assumed.

Approved creative references are checked for current approval, an active asset URL and the requested MAIN/SPONSORED slot relationship when saved/validated/published. That check is a reference-integrity check, not a grant of delivery authorization. Runtime campaign eligibility, manifest leases, checksums, schedules and proof attribution remain owned by the existing advertising pipeline.

### Android interpretation and preview boundary

The Screen Player now has a native Compose geometry host and a strict read-only parser for Custom contract version 1. It accepts the low-resource zone types `MAIN_AD`, `IMAGE`, `VIDEO`, `TEXT`, `LOGO`, `QR_OFFER`, `SPONSORED_AD` and `BACKGROUND_IMAGE`. `CLOCK`, `WEATHER`, `TICKER` and `NAVIGATION_MAP` are rejected unless the caller explicitly supplies the corresponding verified device capability. Unknown schema widget types fail closed. The Auto Lite guard permits at most one video zone, one main campaign slot and one independent sponsor slot. Zone edges are rounded from normalized edges (rather than independently rounded widths), clipped to the screen and clipped within each zone; each edge differs from its unrounded value by at most 0.5 physical pixel. The browser and native geometry implementations share this rule.

The Compose host deliberately takes a content-rendering callback. This keeps media selection and campaign/proof authorization outside layout interpretation. The debug screenshot fixture supplies local synthetic zone content and has no API, playback proof or impression dependency. Custom manifests are not emitted or assigned to live displays, and the current host is not yet connected to production media-resolution adapters. Do not treat the synthetic preview as end-to-end media or advertising acceptance.

Connected instrumentation must use `apps/screen-android/scripts/connected-test-safe.py` with one exact disposable AVD serial. It checks sole-device status and emulator boot/product properties before invoking Gradle. If a physical board or any ambiguous target is visible to that ADB server, the guard refuses to run; do not bypass it.

### V2 verification status

Disposable AOSP emulator screenshots are saved under `evidence/layout-studio-v2/`. Geometry assertions cover 1280×720 at runtime and shared rounding vectors cover 854×480 and 1920×1080. These x86 emulator results verify rendering geometry only; they are not ARMv7 performance evidence. Initial-frame timing, sustained frame latency, memory allocation, decoder counts and MapLibre lifecycle have not been benchmarked for Custom content. Capability certification and production content adapters remain release blockers.

## Database rollout

Migration `20261106120000_layout_studio_v1` is additive. It creates template, revision and prepared-assignment persistence; it does not backfill rows, update displays, or assign layouts. Validate and test it against a disposable database, then deploy only after review and a restorable backup. Do not apply it to staging or production as part of this code change.

## Safe activation sequence (future)

1. Merge/ship the PR #58 V3 dependency and this Layout Studio API/web release separately.
2. Validate the additive migration against a restored staging backup and apply it with database-owner approval.
3. Live assignment remains hard-disabled in the API until native rendering, compatibility certification and staged rollout are complete.
4. Finish native Compose renderer contract support; do not use WebView.
5. Certify capabilities on representative hardware and add server-side assignment compatibility checks.
6. Validate with synthetic previews and disposable devices, then perform an approved staged rollout with rollback and audit monitoring.
7. Do not change active display assignments until explicit rollout authorization and acceptance.

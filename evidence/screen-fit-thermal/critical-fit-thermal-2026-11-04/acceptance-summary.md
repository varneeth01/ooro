# PR #58 physical acceptance — 2026-11-04

## Result

Physical creative-fit and thermal acceptance are **BLOCKED**. The board is reachable and OORO is running as HOME, but the active manifest contains zero creatives. No image/video fit or playback workload can currently be reproduced. There was no onsite supervision confirmation for thermal workload testing, so no playback load was started.

## Device and current screen

- ADB serial: `6c001040f441c941d94` (authorized, state `device`)
- Hardware: MBOX / Allwinner `sun50iw9p1`; Android 10 / API 29; ARMv7
- Display: 1280×720, density 213 dpi, rotation 0, 60 Hz
- Screen Player: `com.ooro.screenplayer`, version 0.1.0 / versionCode 1
- HOME resolver, `mHomeProcess`, resumed activity and focused window: OORO `MainActivity`
- Screenshot: [current-screen.png](current-screen.png)
- Activity, memory and graphics snapshots: [activity.txt](activity.txt), [meminfo.txt](meminfo.txt), [gfxinfo.txt](gfxinfo.txt)

The screenshot shows the FOUR_ZONE empty-content state: black primary ad area, placeholder text, and empty right-side panels. This is not evidence of a cropped creative.

## Manifest and pairing evidence

- Active Room manifest: version `143562779`, `FOUR_ZONE`, item count **0**.
- Layout metadata: primary width 67%, ad height 86%, QR height 47%, ticker speed 42. App-side layout clamps are applied; there is no media to measure against them.
- The app's current local pairing/log evidence identifies display `d26fd00f-02fd-4807-8b4b-263c806eb077`. Earlier recovery evidence identifies the original display as `e3252569-6322-40b8-a88a-09a992ea998a`. The relationship and intended record require an authorized staging Super Admin to verify. No pairing, assignment or server record was changed.
- Sanitized app logs show successful heartbeat acceptance and manifest acceptance with zero items. They show no current asset-ready or proof-upload acceptance events.
- Creative cache has zero files (directory uses 4 KB filesystem allocation); local proof table has zero records.

The immediate blocker for reproducing alignment is the empty manifest. It is not yet possible to distinguish a bad fit mode, placement allocation, source crop, video rotation metadata or external display overscan from a real delivered creative.

## Idle-only thermal/resource observation

At the captured idle snapshot, OORO was foreground with no creative and no active media decoder workload:

| Measurement | Observation |
|---|---:|
| CPU thermal sensor | 56.519 °C |
| GPU thermal sensor | 55.790 °C |
| Video-engine thermal sensor | 57.977 °C |
| DDR thermal sensor | 57.248 °C |
| Screen Player PSS (`dumpsys meminfo`) | 66,014 KB total PSS |
| Android ThermalService | HAL not ready; thermal status unknown |
| MediaCodec decoder | No active creative to inspect |

These are single idle readings, not a controlled before/after comparison and not evidence that heating is resolved. No GPU utilization, frame pacing, decoder load, throttling state, or temperature delta under OORO ad playback was established. Sensor readings are not enclosure surface temperatures.

## PR status and next action

- PR #58 head: `c99185ed303a8752e3789eef1206928ae2fc1ba2`
- GitHub `validate`: PASS
- Netlify deploy-preview checks: FAIL (header rules, pages changed, redirect rules/deploy preview); PR merge state is `UNSTABLE`.
- No source change is justified by the current physical state. The PR is not accepted or merged on this evidence.

An authorized staging Super Admin must verify the current `d26…` record against original display `e325…`, confirm the intended existing display and its approved campaign/creative assignment, and restore the intended nonempty manifest without creating a duplicate screen. The operator should then provide an approved test creative and an onsite-supervised short playback window. After that, capture the active creative ID/type/dimensions/fit mode and region/media bounds, then repeat short image, video and layout measurements. Do not run a long thermal soak until short supervised results are safe.

## Staging access and source-level eligibility check

On 2026-11-04, a read-only unauthenticated request to `GET https://api-staging.theooro.com/api/admin/displays` returned HTTP `401 UNAUTHORIZED` (“Authentication required”, request ID `req-4co`). The shell had no OORO/staging credential variables, and the authorized browser-session provider reported no available browser sessions. No token or cookie was read, and no login attempt or data mutation was made.

The supported diagnostic endpoint is `GET /api/admin/displays/{displayId}/manifest-debug`; it requires an authenticated admin role and returns the display's selected items plus coarse reason codes. Source defines `NO_ASSIGNMENT`, `DISPLAY_DISABLED`, `NO_ACTIVE_CAMPAIGN`, `OUTSIDE_SCHEDULE`, and `NO_ELIGIBLE_CREATIVE`. From the implementation, a scheduled campaign contributes items only when the campaign is ACTIVE/SCHEDULED and not ended, its schedule is PUBLISHED and not ended, there is a RESERVED/ACTIVE inventory allocation for that exact display and eligible date, the schedule references an APPROVED creative, and its asset is active with a URL. The code can establish these possible exclusion points, but not which applies to either staging record. The identity mismatch is causal only if the intended campaign assignment/allocation is attached to one record while the device's current token resolves to the other; that comparison requires authenticated staging inspection.

Required operator action: sign in to `https://staging.theooro.com/admin` with an authorized SUPER_ADMIN session, open both existing display records and compare device association, assignment and delivery history. Use the manifest-debug view for each record; inspect campaign approval, published schedule windows, creative approval/asset readiness and per-display inventory allocations. Keep both records and proofs intact. Only after the authoritative existing display and a clearly approved test campaign are confirmed, assign/allocate within staging using the supported admin workflow. Then wait for the board's normal manifest sync and verify the same display ID, nonempty manifest, asset checksum/download and playback before supervised fit/thermal tests. Do not issue a pairing code or create another display.

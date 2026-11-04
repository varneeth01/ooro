# OORO Screen Player reinstall acceptance — 2026-11-04

## Result

The authorized fresh installation succeeded. OORO is selected as HOME and ActivityManager reports its process as `mHomeProcess`, including after a Settings-to-HOME test. The app is unpaired: uninstall removed the previous local identity/data, and startup logs report credentials unavailable. Android is showing a location permission prompt over the pairing screen; no permission was granted or denied. Advertising and performance acceptance therefore remain incomplete.

## Checks and actions

- Device serial `6c001040f441c941d94` connected and authorized. Identity: MBOX / `sun50iw9p1`, Android 10/API 29, `armeabi-v7a`, 1280×720.
- Candidate SHA-256: `ba54dcce2505f23642acc0ed9f7a19c0a203ce28a9c61977a6e6d8c3dce4c5c2` (matched expected).
- Package/version: `com.ooro.screenplayer`, versionCode 1, versionName 0.1.0; minSdk 26, targetSdk 35.
- Embedded build config: `API_BASE_URL=https://api-staging.theooro.com`; `USE_MOCK_BACKEND=false`.
- Candidate and pulled installed `base.apk` SHA-256 match exactly. APK signer SHA-256: `b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33` (Android debug signer).
- `adb install` succeeded. No other packages were changed.
- Before HOME selection, resolution returned Android `ResolverActivity`. Supported `cmd package set-home-activity --user 0 com.ooro.screenplayer/.MainActivity` returned `Success`; subsequent resolution returned OORO.
- HOME key and a Settings launch followed by HOME produced `mHomeProcess` for `com.ooro.screenplayer`. The task contains OORO `MainActivity` and Android's location permission controller. Launcher10 remains installed and enabled.
- Screenshot shows OORO's pairing screen beneath the OS location prompt. Full normal-playback fullscreen behavior could not be assessed from this prompt state.
- DeviceOS Agent remains installed, versionCode 1/versionName 0.1.0.

## Thermal observations

Short passive sensor reads, in °C (raw sysfs millidegrees / 1000):

| Stage | CPU | GPU | Video engine | DDR |
|---|---:|---:|---:|---:|
| Before install | 60.083 | 59.516 | 62.837 | 61.217 |
| After first launch | 68.507 | 65.672 | 65.348 | 63.728 |
| After Settings/HOME | 62.351 | 61.541 | 62.027 | 61.298 |

ThermalService continues to report HAL unavailable and unknown status. These short samples do not establish throttling or a safe sustained operating limit. Since the initial launch coincided with an approximately 8.4°C CPU sensor rise and the board has previously been observed near 70°C at idle, no creative playback, map test, network pairing, or longer load test was run.

## Acceptance table

| Item | Result | Evidence / limitation |
|---|---|---|
| Device identity | PASS | `preinstall-2026-11-04.txt` |
| APK integrity/configuration | PASS | SHA, metadata and embedded build config verified |
| Fresh installation | PASS | `install-2026-11-04.log`; installed APK hash matches candidate |
| HOME assignment/resolution | PASS | `home-assignment.txt`, `home-after-selection.txt` |
| HOME key / Settings return | PASS | `processes-after-settings-home.txt`, `activities-after-settings-home.txt`; OORO is `mHomeProcess` |
| Fullscreen launcher | BLOCKED | Runtime permission prompt overlays setup; ordinary playback screen unavailable |
| Previous screen identity recovery | FAIL/BLOCKED | Package data was removed; no restore set. No credentials recreated |
| Pairing | BLOCKED | Requires operator-provided valid staging pairing code; do not reuse guessed identity |
| Manifest download | BLOCKED | Unpaired |
| Image/video rendering and creative fit | BLOCKED | No approved creative or paired manifest; no playback test |
| CPU/memory during playback | BLOCKED | Playback tests stopped; startup-only sample is not a performance benchmark |
| Thermal behavior | BLOCKED | Temperature rose during startup then fell; no sustained safety conclusion possible |
| Offline playback / proof-of-play | BLOCKED | No recovered cache or identity; no creative playback |
| DeviceOS Agent preservation | PASS | Still installed; version 1 / 0.1.0 |

## Evidence files

- `preinstall-2026-11-04.txt`
- `install-2026-11-04.log`
- `apk-sha256.txt`, `installed-certificate.txt`, `installed-base.apk`
- `home-before-selection.txt`, `home-assignment.txt`, `home-after-selection.txt`
- `screen-player-first-launch.png`, `screen-current-permission-state.png`, `screen-after-settings-home.png`
- `processes-after-launch.txt`, `processes-after-settings-home.txt`, `activities-after-settings-home.txt`
- `current-startup-logcat.txt`, `thermal-sensors-after-startup.txt`, `thermal-after-settings-home.txt`

Next operator actions: decide whether to allow OORO location access for location-dependent features, provide an authorized one-time staging pairing code for this newly installed identity, and confirm hardware thermal safety before supervised creative testing. Do not claim the previous pairing/cache was restored or PR #58's thermal fix was physically accepted.

## Onboarding change validation addendum

The build removed the automatic permission request from `MainActivity.onCreate`. The setup screen now shows the pairing form and explains that location is optional; an explicit **Enable location (optional)** action invokes Android's runtime permission prompt. Denial returns a clear unavailable status without retrying automatically. The technician diagnostics screen also reports permission/fix state and exposes the same explicit action.

- Tests/lint/build: `testDebugUnitTest`, `lintDebug`, and `assembleDebug` all succeeded against staging with mock backend disabled. Unit results: 33 tests, 0 failures, 0 errors, 1 skipped. Lint: 0 errors, existing warnings remain.
- The onboarding APK was installed with `adb install -r` only after matching package, versionCode and signer checks. Install succeeded; app data inode remained unchanged. The update temporarily made Launcher10 active HOME; the supported HOME assignment was reapplied and verified. Current preferred HOME and `mHomeProcess` are OORO.
- Physical screenshot [onboarding-pairing-screen-clear.png](onboarding-pairing-screen-clear.png) shows the OORO pairing form and optional-location explanation with the keyboard dismissed; no Android permission dialog is visible. Current PackageManager state reports coarse and fine location granted, and the screen says location is enabled. We did not tap Allow or invoke `pm grant`; the grant's origin is unknown. The denied-permission path is covered only by the status unit test, not physical validation.
- The new APK SHA-256 is recorded by the build output as `b7e67df996be766c3f3f95472764dbdde9550b5f3b163acba944f9c7c387d15d`; signing certificate remains `b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33`.
- The prior screen ID visible in pre-uninstall logs is `e3252569-6322-40b8-a88a-09a992ea998a`. Existing backend code supports creating a pairing code for an existing `displayId`, and `/api/device/pair` updates that display row, so the existing record can be reused without creating another display. The authorized admin session is not available here, so no code was generated or submitted. Use the authenticated admin screen detail for this record and its existing pairing-code route; do not use **New screen**.
- No pairing, heartbeat, manifest, asset download, ad rendering, offline playback or proof upload acceptance was possible without an authorized code. Short launch snapshots again showed CPU readings between roughly 59 and 69°C; Android thermal HAL remains unavailable. No creative load testing was done.

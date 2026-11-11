# PR #58 physical rendering/performance acceptance

Date: 2026-11-05

Device: Android 10 / API 29, Allwinner `sun50iw9p1`, ARMv7, 1280×720, density 213

Package: `com.ooro.screenplayer`
ADB: `6c001040f441c941d94`

## Candidate and preservation

- Debug build used `https://api-staging.theooro.com` and `useMockBackend=false`.
- APK: `apps/screen-android/app/build/outputs/apk/debug/app-debug.apk`.
- Candidate SHA-256: `d5ce7b3eba9ac788ed747aa480350dd76f7161dca7392cd63b6902fed5360f9f`.
- Package/version: `com.ooro.screenplayer`, versionName `0.1.0`, versionCode `1`.
- Candidate signing certificate SHA-256: `b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33`; matched the installed certificate before the data-preserving `adb install -r` update.
- `firstInstallTime` remained `2026-11-04 11:34:13`; only `lastUpdateTime` changed. Pair identity remained `d26fd00f-02fd-4807-8b4b-263c806eb077`, heartbeat was accepted, and the DeviceOS Agent remained installed.
- HOME resolved to and resumed `com.ooro.screenplayer/.MainActivity` after test activities were stopped. No HOME reassignment was performed.
- Synthetic preview uses the production `Player`, `PrimaryAdRegion`, `PlayerView`, image decode and layout code. It supplies local files, sets `vm=null`, and logs `proofsDisabled=true networkManifestDisabled=true`. No synthetic proof or campaign delivery is generated. The Screen Player's normal background workers can still send the existing display heartbeat, refresh the real manifest or reconcile an already queued proof while the process runs; the preview did not change those records or enqueue a proof.

## Rendering findings

- `FIT`/contain is now used by default. Legacy `FILL` also contains; only explicit `CENTER_CROP` crops. Images use Compose `ContentScale.Fit`; video uses Media3 `RESIZE_MODE_FIT`.
- Image decode now samples to measured ad-region pixel dimensions off the UI thread, reads EXIF orientation, transforms rotated/flipped images, and recycles obsolete bitmaps.
- Physical screenshots show full edge borders and corner markers for landscape 16:9, portrait, square, ultrawide, nonstandard 1000×700, and EXIF-rotated JPEG assets. See `final-*.png`.
- FOUR_ZONE physical viewport: 858×641 px (67% width × 89% height). The static screenshot shows the entire creative inside its region; offer/navigation/ticker remain within their panels.
- A defect was confirmed in `SPLIT_50_25_25`: the prior implementation allocated 75% to the creative. It now uses three clipped columns at 50/25/25; the measured creative viewport is 640×720 px. The screenshot attempt during the thermal event was black because the debug activity was terminated before its first frame, so visual acceptance of the corrected split layout remains BLOCKED.
- Landscape 1280×720 H.264 rendered through `OMX.allwinner.video.decoder.avc`; Media3 reported 1280×720, rotation 0, FIT viewport 1280×720. A portrait-video viewport measurement was 405×720 for a 720×1280 source. No claim is made for physical portrait-video edge acceptance: the test was stopped during the thermal event.
- Device output was 1280×720 at density 213; no evidence of Android display overscan was observed in the captured screenshots.

## Resource and thermal measurements

Values are snapshots, not sustained averages. The Android thermal HAL was not ready, so temperatures came from readable Allwinner sysfs thermal zones and indicate SoC sensors, not case-surface temperature.

| Mode / evidence | OORO PSS | CPU evidence | CPU / GPU / VE / DDR |
|---|---:|---|---|
| Idle placeholder before preview, `idle-baseline.txt` | 62,865 KB | OORO threads sleeping; sampled 0% process CPU | 63.3 / 62.5 / 65.6 / 63.7 °C |
| FOUR_ZONE static image, `mem-four-zone-static.txt` | 68,801 KB | `dumpsys cpuinfo`: 0% OORO in the captured interval | 68.8 / 67.3 / 68.8 / 67.1 °C |
| 720p video, short thread snapshot, `top-single-video-threads.txt` | 69,933 KB | ExoPlayer loader 46.3%, playback 27.5%, codec looper 5.7%; MediaCodec service thread 4.3% in that one-second snapshot | 73.6 / 70.6 / 71.6 / 69.8 °C |
| Immediately after stopping video | — | OORO media player released | 69.6 / 68.9 / 70.2 / 67.9 °C |
| Short corrected split static test | — | `dumpsys cpuinfo` after stop showed OORO 0%; sample was after foreground termination | peak 76.4 / 73.0 / 72.3 / 71.4 °C; fell to 70.1 / 67.9 / 69.2 / 67.8 °C after stopping |
| Final OORO idle after cooldown | 59,069 KB | OORO returned to HOME | 65.6 / 65.0 / 67.9 / 66.6 °C |

The short test caused unexpectedly high sensor readings, and the later preview activity took about 12.5 seconds to draw its first frame before dying during the thermal event. Physical tests were stopped; no prolonged test was run. The thermal behavior is **not accepted**. The captured CPU sample is too brief and startup/JIT-contaminated to prove the sustained thermal root cause. GPU utilization counters and an OEM thermal-throttling status were unavailable. The video decoder was hardware-backed; decoder duplication was not established. MapLibre was disabled in the measured cases; no map tile/render events appeared. Map-on, ticker-on, QR-on and offline playback profiling were not attempted after the thermal rise.

## Data and delivery state

- Pairing and HOME were preserved through `adb install -r`; the device accepted a heartbeat after returning to MainActivity.
- Current manifest remains version `143562779` with zero items. No real creative was available, so campaign playback, offline creative playback and proof-of-play acceptance are outside this local rendering test.
- The proof queue remained empty; the preview generated no proofs.
- DeviceOS Agent remained installed and was not modified.

## Build

Command:

```sh
ANDROID_HOME=/home/varneeth/Android/Sdk ANDROID_SDK_ROOT=/home/varneeth/Android/Sdk \
  ./gradlew testDebugUnitTest lintDebug assembleDebug \
  -PdeviceApiBaseUrl=https://api-staging.theooro.com -PuseMockBackend=false --stacktrace
```

Result: `BUILD SUCCESSFUL`. `git diff --check` passed. The final change set is not a thermal fix claim: creative fitting and layout bounds are improved, while physical thermal acceptance remains failed and the underlying sustained heat cause remains unresolved.

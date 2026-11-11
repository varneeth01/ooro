# Screen fit and thermal acceptance evidence

## Software validation

- Screen Player command: `gradle -p apps/screen-android -PdeviceApiBaseUrl=https://api-staging.theooro.com -PuseMockBackend=false -PsyncIntervalSeconds=90 testDebugUnitTest lintDebug assembleDebug --stacktrace`
- Result: `BUILD SUCCESSFUL`; 30 unit tests, 0 failures, 0 errors, 1 skipped. Android lint passed.
- APK: `apps/screen-android/app/build/outputs/apk/debug/app-debug.apk`
- APK SHA-256: `ba54dcce2505f23642acc0ed9f7a19c0a203ce28a9c61977a6e6d8c3dce4c5c2`
- APK package/version: `com.ooro.screenplayer`, version code `1`, version name `0.1.0`.
- Configured API: `https://api-staging.theooro.com`; `USE_MOCK_BACKEND=false`.
- Debug sync interval in this candidate: 90 seconds, matching release default.
- Candidate signing certificate: Android debug certificate SHA-256 `b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33`.
- ARMv7 libraries present: `lib/armeabi-v7a/libmaplibre.so` and `lib/armeabi-v7a/libandroidx.graphics.path.so`.
- Web validation: creative-fit unit tests passed (2/2); TypeScript check passed; touched-file ESLint passed with only two pre-existing `campaign-editor.tsx` effect dependency warnings; production Next build completed successfully.
- `git diff --check`: passed.

## Physical board / thermal measurements

Physical validation is **BLOCKED**. `adb devices -l` returned an empty device list for this run. No APK was installed. The current installed signing certificate and version therefore could not be compared with this candidate.

No baseline or after-change measurements are available for CPU, GPU, process memory, decoder utilization, frame stability, thermal status, board sensors, brightness, offline playback, map behavior, pairing, heartbeat or proof delivery. No screenshot or logcat bundle was captured. Thermal improvement and safe operating temperature are not established.

Reconnect the authorized board and perform short supervised measurements under identical power, brightness, content and network conditions before any soak test. Verify the installed certificate before using `adb install -r`; do not clear data.

## Source-level findings (not device measurements)

- `FitMode.FILL` was mapped to image crop and Media3 zoom, which can crop edges; FIT was already contain. The updated mapping preserves contain for FIT and legacy FILL, while explicit `CENTER_CROP` remains intentional crop.
- Still images were decoded at source resolution synchronously in Compose. The updated path measures its region, bounds decoded dimensions with sampling and decodes off the main thread, then releases the bitmap with the composition lifecycle.
- QR images were built as 512×512 bitmaps on the UI thread using per-pixel writes. The updated path sizes generation to the measured offer panel, builds off the main thread and uses a bulk pixel write.
- MapLibre initialized at process startup and the navigation panel created a map even while navigation was inactive. Initialization/map creation are now deferred until navigation is active; camera movement is throttled. These are plausible workload reductions, not demonstrated thermal root causes.
- Debug sync interval defaulted to 15 seconds, versus 90 seconds in release. A successful app heartbeat also enqueued a worker that sends a second heartbeat and polls commands. Debug now defaults to 90 seconds, and the extra worker is only scheduled when the proof queue is nonempty. Explicit `syncIntervalSeconds` overrides remain available for diagnostics.
- The map lifecycle observer receives current-state callbacks when attached; manual `onStart`/`onResume` calls before observer attachment duplicated those transitions. The manual calls were removed so lifecycle observer replay owns initial startup callbacks.
- Media3 player creation/release remains tied to the active creative composition. Decoder initialization is logged to support future physical profiling. Hardware decoder selection and duplicate decoder absence remain unverified on this board.

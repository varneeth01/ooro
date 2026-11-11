# PR #58 code-level performance work — 2026-11-05

## Scope

Source-level optimizations and JVM unit coverage only. No APK was installed on the physical board and no loaded playback was started.

## Changes

- The ticker now measures its actual text with Compose `TextMeasurer` and animates only when the announcement exceeds its viewport. Short or empty tickers remain static. Long ticker movement remains confined to its `graphicsLayer` translation.
- Navigation state is now collected inside `NavigationPanel`, so location/navigation updates do not invalidate the player parent and its advertising subtree.
- Image decode state and coroutine work use an explicit `(path, measured width, measured height)` key. Existing IO-thread decoding and bitmap disposal are preserved.
- Media3 player creation uses an explicit `(manifest item, playback key, preview)` key. `PlayerView.update` avoids reassigning the same player or resize mode.
- MapView remains conditional on active navigation; no MapLibre instance is added to the inactive path.

## Validation

Command: `./gradlew testDebugUnitTest lintDebug assembleDebug -PdeviceApiBaseUrl=https://api-staging.theooro.com -PuseMockBackend=false`

Result: **BUILD SUCCESSFUL**. Six `PlayerPerformanceRulesTest` cases passed; lint and debug APK assembly passed. Existing compiler deprecation warnings remain.

| Check | Result |
| --- | --- |
| APK | `apps/screen-android/app/build/outputs/apk/debug/app-debug.apk` |
| SHA-256 | `28e38e0741f1f068682fa84757389725062b3d010566fea4f3c423dcd455b909` |
| Package/version | `com.ooro.screenplayer`, `0.1.0` / versionCode `1` |
| Backend | `https://api-staging.theooro.com`; `USE_MOCK_BACKEND=false` |
| Signing | Android debug certificate SHA-256 `b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33` |
| ABIs | `armeabi-v7a` and `arm64-v8a`; `libmaplibre.so` is present for both |

## Not established

No Compose emulator/instrumentation run or physical playback comparison was performed. CPU/GPU/decoder/temperature improvement, real creative rendering, and thermal safety remain unverified. The APK was not installed. PR #58 must remain open pending supervised physical acceptance.

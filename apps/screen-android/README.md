# OORO Screen Player

Native Kotlin/Compose Android player for managed advertising screens. It lives in the OORO monorepo but is built independently with Gradle.

## Build

```bash
cd apps/screen-android
./gradlew test
./gradlew lint
./gradlew assembleDebug
```

The debug build uses `MockDeviceApi`; enter `OORO-DEMO` on the setup screen. Debug defaults to `http://10.0.2.2:8080` for an Android emulator. Configure API values through build types in `app/build.gradle.kts`; production releases disable demo pairing and must use HTTPS.

## Behavior

The device UUID is generated once and persisted. Pairing stores the device session, after which startup enters player mode and sync runs independently. The local manifest/database and bundled OORO fallback are intended to keep playback alive through network loss. Current demo playback is branded placeholder content; remote creative download and Media3 rendering are the next integration surface once the backend manifest is available.

## Kiosk and boot

`BootReceiver` starts paired devices after `BOOT_COMPLETED`. Without Device Owner, the player uses immersive fullscreen only. Provision managed test hardware after a factory reset with:

```bash
adb shell dpm set-device-owner com.ooro.screenplayer/.kiosk.OoroDeviceAdminReceiver
```

OEM support varies. Enable Lock Task from a device-owner provisioning controller and set OORO as the default HOME app manually in Settings where supported; the HOME intent is declared but never forced.

## Contract and troubleshooting

The canonical device endpoints and payloads are documented in [`docs/API_CONTRACT.md`](../../docs/API_CONTRACT.md) and [`docs/api/device-api.yaml`](../../docs/api/device-api.yaml). No Firebase, Play Services, camera, microphone, or storage permission is required. If a debug device cannot pair, confirm the emulator API host (`10.0.2.2`) or use mock mode.

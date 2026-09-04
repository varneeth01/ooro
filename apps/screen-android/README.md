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

The device UUID and encrypted device token are persisted. Pairing stores the device session, manifests are activated only after required assets are cached, and the last valid manifest remains available during network loss. Images and videos are rendered from the local creative cache through Media3 for video playback.

## Kiosk and boot

`BootReceiver` starts paired devices after boot and package replacement. Without Device Owner, the player uses immersive fullscreen only. When provisioned as Device Owner, the app configures Lock Task and starts it from the display activity. Provision managed test hardware after a factory reset with:

```bash
adb shell dpm set-device-owner com.ooro.screenplayer/.kiosk.OoroDeviceAdminReceiver
```

OEM support varies. The HOME intent is declared; use the system HOME chooser, MDM, or OEM image provisioning where the platform does not expose a supported role API. See [`docs/DEVICE_PROVISIONING.md`](../../docs/DEVICE_PROVISIONING.md).

## Contract and troubleshooting

The canonical device endpoints and payloads are documented in [`docs/API_CONTRACT.md`](../../docs/API_CONTRACT.md) and [`docs/api/device-api.yaml`](../../docs/api/device-api.yaml). No Firebase, Play Services, camera, microphone, or storage permission is required. If a debug device cannot pair, confirm the emulator API host (`10.0.2.2`) or use mock mode.

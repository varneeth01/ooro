# OORO Screen Player

Native Kotlin/Compose Android player for managed advertising screens. It lives in the OORO monorepo but is built independently with Gradle.

## Build

```bash
cd apps/screen-android
./gradlew test
./gradlew lint
./gradlew assembleDebug
```

Debug defaults to mock mode and `http://10.0.2.2:8080` for an Android emulator. For a physical device, pass a developer-machine LAN address reachable from that device and disable the mock backend, for example `./gradlew assembleDebug -PuseMockBackend=false -PdeviceApiBaseUrl=http://192.168.1.20:8080`. Do not commit a LAN IP; production builds must use HTTPS.

## Behavior

The device UUID and encrypted device token are persisted. Pairing stores the device session, manifests are activated only after required assets are cached, and the last valid manifest remains available during network loss. Images and videos are rendered from the local creative cache through Media3 for video playback. Fine/coarse location permission is requested for telemetry only; denying it does not block pairing or playback. While the player is active, heartbeats are sent about every 15 seconds when moving and 90 seconds when stationary; location fixes are requested at a 10-second/75-meter provider interval. No background-location permission is requested.

## Kiosk and boot

`BootReceiver` starts paired devices after boot and package replacement. Without Device Owner, the player uses immersive fullscreen only. When provisioned as Device Owner, the app configures Lock Task and starts it from the display activity. Provision managed test hardware after a factory reset with:

```bash
adb shell dpm set-device-owner com.ooro.screenplayer/.kiosk.OoroDeviceAdminReceiver
```

OEM support varies. The HOME intent is declared; use the system HOME chooser, MDM, or OEM image provisioning where the platform does not expose a supported role API. See [`docs/DEVICE_PROVISIONING.md`](../../docs/DEVICE_PROVISIONING.md).

## Contract and troubleshooting

The canonical device endpoints and payloads are documented in [`docs/API_CONTRACT.md`](../../docs/API_CONTRACT.md) and [`docs/api/device-api.yaml`](../../docs/api/device-api.yaml). No Firebase, Play Services, camera, microphone, or storage permission is required. If a debug device cannot pair, confirm the configured API host is reachable from it or use mock mode.

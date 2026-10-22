# Android Release Readiness

## Applications

| App | Application ID | Version in audited revision | Release status |
| --- | --- | --- | --- |
| Screen Player | `com.ooro.screenplayer` | `1` / `0.1.0` | BLOCKED: signing and physical acceptance not verified |
| DeviceOS Agent | `com.ooro.deviceagent` | `1` / `0.1.0` | BLOCKED: signing and physical acceptance not verified |

Both projects target/compile SDK 35, require Java 17, use HTTPS for release API URLs, and disable mock/demo pairing in release builds. Screen Player uses Media3 and encrypted credential storage. DeviceOS uses Keystore-backed credentials, checksum/package/version/certificate validation and WorkManager reconciliation.

## Safe build commands

```bash
cd apps/screen-android
OORO_DEVICE_API_URL=https://api-staging.example.invalid ./gradlew test lint assembleRelease

# DeviceOS uses the Screen Player wrapper in this repository:
./gradlew -p ../deviceos-android \
  -PdeviceApiBaseUrl=https://api-staging.example.invalid \
  -PdeviceVersionCode=1 -PdeviceVersionName=0.1.0 \
  testDebugUnitTest assembleRelease
```

Replace the placeholder only with an approved staging HTTPS endpoint. Release signing must be supplied by the CI/Coolify/Android release environment; never commit a keystore, private key or signing password. The current audit environment has no Android SDK, so no APK/AAB artifact was generated and no physical-device, Device Owner, Lock Task, OTA or upgrade-preservation test was performed.

Before fleet rollout, verify pairing, encrypted credential persistence, heartbeat, GPS policy, manifest caching, checksum validation, Media3 playback, proof-of-play, reconnect, DeviceOS enrollment, command delivery, pending user action, OTA health reporting, rollback and data preservation on approved test devices.


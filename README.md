# OORO monorepo

This repository contains the existing OORO web app at the repository root and the native Screen Player at [`apps/screen-android`](apps/screen-android). The Android project is an independent Gradle build; it is intentionally not a pnpm package.

The device API contract is maintained in [`docs/api/device-api.yaml`](docs/api/device-api.yaml). Device architecture and pairing expectations are documented under [`docs/device`](docs/device).

## Development

```bash
pnpm dev                 # existing web app
cd apps/screen-android
./gradlew assembleDebug  # native APK
```

The current Android debug build uses a mock backend and the `OORO-DEMO` pairing code. Release builds disable demo pairing and cleartext traffic.

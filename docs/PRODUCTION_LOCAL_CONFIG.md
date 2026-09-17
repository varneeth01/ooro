# OORO V1 production and local delivery configuration

## Web/API production

- `DATABASE_URL`: managed PostgreSQL; never localhost in production.
- `PUBLIC_ASSET_BASE_URL=https://theooro.com` (or the canonical CDN/object-storage HTTPS origin).
- `OBJECT_STORAGE_DIR`: persistent mounted object-storage adapter for the current file-backed implementation, or replace `storeCreative` with the deployment's S3-compatible adapter. Assets must not be an ephemeral serverless filesystem.
- `RAZORPAY_MODE`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
- `JWT_SECRET`, `DEV_MOCK_OTP_ENABLED=false`, and production CORS origins.

The release APK uses `https://theooro.com` only. Device traffic is outbound HTTPS with bearer device authentication; NAT or a shared LAN is not required. Manifests are fetched after heartbeat/version comparison, and queued `SYNC_MANIFEST`/`REFRESH_MANIFEST` commands are delivered on the next poll.

## Android debug

Set a Gradle property or environment variable without changing source:

```sh
OORO_DEVICE_API_URL=http://10.0.2.2:8080 \
OORO_USE_MOCK_BACKEND=false \
./gradlew :app:assembleDebug
```

For a physical device use the laptop's reachable LAN URL, for example `http://192.168.1.20:8080`. The debug build alone permits HTTP and exposes the endpoint in its diagnostics screen. Release has no endpoint override and rejects non-HTTPS at runtime.

## Delivery verification

1. Debug APK + local API: pair, heartbeat, command poll, manifest, asset download, Media3 playback and ProofOfPlay.
2. Debug APK + public HTTPS API: repeat on a separate network/mobile hotspot.
3. Release APK + `https://theooro.com`: verify no LAN/localhost dependency.
4. Admin publishes from a different network; the screen receives the manifest on the next heartbeat/command poll, including after an offline period.

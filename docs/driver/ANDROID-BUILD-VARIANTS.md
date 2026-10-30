# OORO Driver Android build variants

The official application identity is `com.ooro.driver`.

| Variant | Application id | Backend | Purpose |
| --- | --- | --- | --- |
| `debug` | `com.ooro.driver` | Mock | Local development only. The app shows a persistent mock-mode banner. Do not install over the official app. |
| `isolated` | `com.ooro.driver.isolated` | Mock | Disposable synthetic-account instrumentation, labeled **OORO Driver (Test)**. It must never be distributed to drivers. |
| `staging` | `com.ooro.driver.staging` | HTTPS staging API | Authorized QA only, labeled **OORO Driver (Staging)**. Build requires `driverStagingApiUrl` or `OORO_DRIVER_STAGING_API_URL`. |
| `release` | `com.ooro.driver` | HTTPS production API | Production distribution. Build is blocked unless `driverProductionApiUrl` or `OORO_DRIVER_PRODUCTION_API_URL` is configured. |

The `isolated` suffix protects the installed official app and its encrypted session/database. Test setup must not clear or uninstall `com.ooro.driver`.

Examples:

```bash
./gradlew :app:assembleDebug
./gradlew :app:assembleIsolated :app:assembleIsolatedAndroidTest
./gradlew -PdriverStagingApiUrl=https://staging.example.test :app:assembleStaging
OORO_DRIVER_PRODUCTION_API_URL=https://api.example.com ./gradlew :app:assembleRelease
```

Each `assemble<Variant>` task builds only that variant; no Gradle task installs an APK. Installation commands must name exactly one APK. The notification test helper is a separate package, `com.ooro.driver.notificationfixture`, and is labeled **OORO Driver (Notification Test)**.

No production credentials are embedded in the APK. Staging and release remain fail-closed when their HTTPS endpoint is not explicitly supplied. Never install `debug` on a device containing the official `com.ooro.driver` app, because debug intentionally uses the canonical application ID for local development.

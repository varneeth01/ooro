# OORO Driver Android build variants

The official application identity is `com.ooro.driver`.

| Variant | Application id | Backend | Purpose |
| --- | --- | --- | --- |
| `debug` | `com.ooro.driver` | Mock | Local development only. The app shows a persistent mock-mode banner. |
| `isolated` | `com.ooro.driver.isolated` | Mock | Disposable synthetic-account instrumentation. It must never be distributed to drivers. |
| `staging` | `com.ooro.driver.staging` | HTTPS staging API | Authorized QA only. Build requires `driverStagingApiUrl` or `OORO_DRIVER_STAGING_API_URL`. |
| `release` | `com.ooro.driver` | HTTPS production API | Production distribution. Build is blocked unless `driverProductionApiUrl` or `OORO_DRIVER_PRODUCTION_API_URL` is configured. |

The `isolated` suffix protects the installed official app and its encrypted session/database. Test setup must not clear or uninstall `com.ooro.driver`.

Examples:

```bash
./gradlew :app:assembleDebug
./gradlew :app:assembleIsolated :app:assembleIsolatedAndroidTest
./gradlew -PdriverStagingApiUrl=https://staging.example.test :app:assembleStaging
OORO_DRIVER_PRODUCTION_API_URL=https://api.example.com ./gradlew :app:assembleRelease
```

No production credentials are embedded in the APK. Staging and release remain fail-closed when their HTTPS endpoint is not explicitly supplied.

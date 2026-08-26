# OORO Mobility Driver

Native Kotlin/Compose driver companion app at `apps/driver-android`. It is a separate Gradle application from the Screen Player and communicates with displays through the OORO API.

## Debug setup

```bash
cd apps/driver-android
./gradlew test
./gradlew lint
./gradlew assembleDebug
```

Debug mode uses `MockDriverApi`:

- OTP: `000000`
- Display pairing: `742981` or `OORO-DEMO`
- Debug ride simulation buttons are visible on Home.

Release builds disable simulation and cleartext traffic. No device secrets or payment credentials are stored in plaintext; driver session tokens are protected by an Android Keystore AES-GCM key.

## Ride safety invariant

`RIDE_ACCEPTED` and `TO_PICKUP` never start advertising or earnings. A notification is normalized locally into an `OoroRideEvent`, then `RideVerificationEngine` requires an event sequence, valid movement, and active display evidence before `ACTIVE_VERIFIED`. The screen stays in `IDLE_SLEEP` while the driver travels to pickup.

## Permissions and privacy

Notification access is explicit and opened through Android Settings. The listener converts selected mobility notifications into normalized provider events and does not upload raw notification text. Location is intended for pickup/active-ride verification only and is persisted locally for retry. The app does not use AccessibilityService to scrape mobility apps.

## Architecture

`domain/` contains the ride state machine, verification reasons and typed models. `data/` contains Room offline queues and encrypted session storage. `network/` contains the API/mock boundary. `notifications/` contains provider adapters and remotely configurable parser seams. `location/`, `rides/`, and `sync/` contain the foreground tracking and retry boundaries. The current UI is a compact pilot surface; server-authoritative KYC, ride verification, proof-of-play acceptance, earnings ledger and payouts remain API-owned.

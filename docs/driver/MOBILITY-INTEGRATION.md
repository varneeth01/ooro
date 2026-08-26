# Mobility integration and privacy

The app uses Android `NotificationListenerService` only after explicit driver consent. Provider adapters (`Uber`, `Ola`, `Rapido`, `Namma Yatri`, and generic) normalize notification signals into `NormalizedRideEvent`. Raw notification content is not uploaded. Provider wording is isolated behind adapters and a versioned/signed remote parser configuration seam so operational wording changes do not require an APK release.

Drivers can revoke notification access from Android Settings. If access is missing, the app remains usable but automatic ride detection is unavailable and any manual fallback remains `MANUAL_DECLARED_RIDE`, never automatically payable.

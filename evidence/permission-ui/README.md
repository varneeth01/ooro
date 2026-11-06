# Screen Player UX verification screenshots

Captured on an isolated Android 15 AOSP emulator at 1280×720. These are emulator-only states; no production screen identity or creative was used.

- `pairing.png`: first-run pairing form; no location prompt on launch.
- `overview.png`, `playback.png`, `presentation.png`, `settings.png`: technician dashboard sections.
- `offline.png`: overview after network was disabled on the emulator, then restored.
- `location-consent-prompt.png`: Android system consent UI reached only after selecting **Allow location** in technician settings.
- `location-denied.png`: permission was denied twice through Android’s consent UI; the app displayed the Android Settings route. Permission remained ungranted.
- `android-app-settings.png`, `settings-return.png`: settings handoff and return with permission state re-read.
- `v3-player-fixtures/`: existing local synthetic V3 player screenshot instrumentation.

Automated instrumentation command:

```sh
adb -s emulator-5554 shell am instrument -w \
  com.ooro.screenplayer.test/androidx.test.runner.AndroidJUnitRunner
```

The launch/recreation test and three V3 rendering screenshot tests passed. No screenshot fixture sends an API request or creates a playback proof.

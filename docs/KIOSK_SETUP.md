# OORO kiosk setup

The APK supports two deployment modes:

- Standard mode: immersive fullscreen and `FLAG_KEEP_SCREEN_ON`; the operator can still leave the app through normal OEM controls.
- Managed mode: provision the APK as Device Owner, allow it in Lock Task, and optionally select it as the HOME app. OORO does not force launcher replacement.

## Development provisioning

Use a factory-reset test device or emulator, install the debug APK, and confirm the receiver declared by this project:

```bash
adb install app/build/outputs/apk/debug/app-debug.apk
adb shell dpm set-device-owner com.ooro.screenplayer/.kiosk.OoroDeviceAdminReceiver
```

Device Owner provisioning is OEM- and Android-version-dependent and normally requires a clean device. If the command is rejected, use the device Settings flow or reset the test device before retrying.

## Home experience

The manifest declares `MAIN`, `HOME`, and `DEFAULT` categories so managed hardware can choose OORO as the preferred launcher. Set it through Settings → Apps → Default apps → Home app where the OEM exposes that control. No automatic launcher takeover is performed.

## Production guidance

Use a managed-device/MDM or OEM provisioning flow, keep release builds on HTTPS, disable demo pairing, and distribute signed APKs through the device-management channel. Do not commit signing keys or use the debug keystore for installed fleet devices.

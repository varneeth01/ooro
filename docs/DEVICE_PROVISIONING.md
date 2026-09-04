# OORO Screen Player device provisioning

The screen application is `com.ooro.screenplayer` and the device-admin component is:

```text
com.ooro.screenplayer/.kiosk.OoroDeviceAdminReceiver
```

## Clean test device

Device Owner provisioning normally requires a factory-reset, unprovisioned device with no accounts already added:

```bash
cd apps/screen-android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell dpm set-device-owner com.ooro.screenplayer/.kiosk.OoroDeviceAdminReceiver
adb shell cmd package resolve-activity --brief -a android.intent.action.MAIN -c android.intent.category.HOME
adb shell am start -a android.intent.action.MAIN -c android.intent.category.HOME
```

Verify ownership and inspect startup logs:

```bash
adb shell dpm list-owners
adb logcat -s PLAYER MANIFEST ASSET NETWORK PAIRING KIOSK PROOF HEARTBEAT COMMAND BOOT
```

The app declares `MAIN`, `HOME`, and `DEFAULT`, so Android can select it as the HOME application. On devices that do not expose a supported programmatic HOME-role API, select OORO once in the system HOME chooser or configure it in the OEM image/MDM. The activity starts Lock Task automatically when OORO is Device Owner; otherwise it remains fullscreen without claiming unsupported kiosk privileges.

For development, remove ownership when the vendor permits it:

```bash
adb shell dpm remove-active-admin com.ooro.screenplayer/.kiosk.OoroDeviceAdminReceiver
adb uninstall com.ooro.screenplayer
```

If removal is rejected, factory-reset the test device. Launch manually with `adb shell am start -n com.ooro.screenplayer/.MainActivity`.

## Factory deployment

For fleets, use Android Enterprise Device Owner provisioning, QR/NFC provisioning, zero-touch enrollment where supported, or OEM/AOSP image integration. Pairing codes remain one-time and device-scoped; do not embed operator credentials or bypass pairing in release builds. An OEM image should set OORO as the HOME role and apply the Device Owner during factory enrollment rather than relying on manual setup on each vehicle.

# Safe Android connected instrumentation tests

Connected Gradle tests install both the app and instrumentation APK. Never invoke `connectedDebugAndroidTest` directly when physical Android devices may be attached.

## Disposable emulator workflow

1. Start one disposable Android Studio AVD and note its exact ADB serial (for example, `emulator-5554`).
2. Disconnect physical Android boards and remove every other ADB target, including offline or unauthorized entries. The preflight refuses unless the selected emulator is the only listed target.
3. Set the exact serial in both the command and allowlist, then run from any directory:

   ```bash
   cd apps/screen-android
   export OORO_DISPOSABLE_EMULATOR_SERIAL=emulator-5554
   python3 scripts/connected-test-safe.py --serial emulator-5554 --preflight-only
   python3 scripts/connected-test-safe.py --serial emulator-5554
   ```

The gate checks the one-device ADB inventory and then queries only that serial for QEMU boot flags, `ranchu`/`goldfish` hardware, SDK product/model, and the emulator build characteristic. It rejects MBOX boards, all physical/unknown devices, multiple targets, offline/unauthorized targets, and an absent emulator. The normal invocation exports `ANDROID_SERIAL` and starts the connected Gradle task only after the gate passes. It never falls back to a different device.

The emulator-only assumptions in instrumentation tests are defense in depth; they do not replace this pre-install host gate.

## Host-side guard tests

These tests mock ADB and never contact a device or invoke Gradle:

```bash
python3 -m unittest scripts/test_connected_test_safe.py -v
```

Unit tests, lint, APK assembly and instrumentation APK compilation do not require ADB and should continue to run through the normal Gradle tasks or CI workflow. CI compiles instrumentation but does not run connected instrumentation.

# Supervised Android 10 performance profile

Run only while the display is attended and stable. Stop playback if the board becomes excessively hot or Android reports a severe thermal state. Do not run a soak test until the short captures look safe.

## Sampling

From the repository worktree, collect five snapshots ten seconds apart per mode:

```bash
evidence/screen-fit-thermal/collect-profile.sh 6c001040f441c941d94 idle-before
```

The script is read-only on the device. It stores timestamped CPU/thread `top`, PSS/RSS, gfxinfo, SurfaceFlinger layer, MediaCodec, thermal service/sensors, CPU frequency, battery/power, services/jobs and HOME snapshots. Some sysfs and dumpsys sections may be permission restricted; retain those outputs as `unavailable` rather than elevating privileges.

Keep display brightness, power source, room conditions, network state, APK, creative, layout and test duration constant. Capture each mode with the existing installed build first, then repeat after a verified data-preserving update. Manually record the exact creative/layout and whether the board is paired or offline alongside each run.

Suggested labels: `idle-before`, `image-before`, `video-before`, `map-active-before`, `map-inactive-before`, `ticker-on-before`, `ticker-off-before`, `qr-on-before`, and `offline-cache-before`; use matching `*-after` labels for the candidate. Do not change HOME, app data, network settings, or DeviceOS state during this comparison.

Review thermal readings after every five-sample run before proceeding. No physical measurements have been collected by this script yet because the authorized serial is currently absent from ADB.

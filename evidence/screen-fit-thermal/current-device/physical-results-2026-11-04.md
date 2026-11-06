# Current board state — physical acceptance blocked

Captured at approximately `2026-11-04T16:23Z` on authorized ADB serial `6c001040f441c941d94`.

## Observed state

- Board: Allwinner MBOX, `sun50iw9p1`, Android 10/API 29, ARMv7; display `1280x720`, density 213.
- Screen Player `com.ooro.screenplayer`: absent from `pm list packages` and `pm list packages -u`; `pm path` returned no APK, PackageManager could not find it, and both app data directories checked were absent.
- HOME: resolver/Launcher10. ActivityManager `mHomeProcess` was `com.swe.dgbluancher`.
- The screenshot [home-2026-11-04.png](home-2026-11-04.png) shows the Launcher10 application menu, including the OORO DeviceOS Agent icon. It is not an OORO ad-playback screenshot.
- DeviceOS Agent `com.ooro.deviceagent` remains installed at versionCode 1/versionName 0.1.0; the package reports stopped/not launched.

## Thermal and resource sample

One passive sample showed CPU `72.719°C`, GPU `71.099°C`, VE `72.314°C`, and DDR `70.370°C`. Android ThermalService reported `HAL Ready: false` and unknown thermal status. **Playback profiling was stopped at this point.** No prolonged or active load test was run.

The earlier single Launcher10 idle snapshot recorded PSS `152105 KB`; `top` reported RSS `295 MB` and CPU `0.0%` for the Launcher10 process at that instant. These values are not an OORO measurement or a before/after comparison. The complete host-side snapshot remains in `../physical-snapshot-2026-11-04.txt`.

## Candidate APK

Existing local candidate: SHA-256 `ba54dcce2505f23642acc0ed9f7a19c0a203ce28a9c61977a6e6d8c3dce4c5c2`, package `com.ooro.screenplayer`, versionCode 1, versionName 0.1.0; debug signer SHA-256 `b280092ff7c8fe377336ec371f68efc3f66af37ad65daf83f9cdaf0ef0ab5e33`. PR head `fbe5cd9` passed validation before this evidence-only update; Android source is unchanged since the build. The installed Screen Player certificate/version cannot be compared because the package is absent.

## Acceptance

- ADB connection and board identity: **PASS**.
- Candidate checksum and package metadata: **PASS**.
- Screen Player installed/signing compatibility: **FAIL/BLOCKED** (package absent; no update-compatible installed certificate to inspect).
- OORO HOME retention: **FAIL** (Launcher10 is active; HOME was not changed).
- Pairing, creative cache and proof queue: **BLOCKED** (Screen Player package/data directories absent; no restoration attempted).
- FIT/overflow screenshots, image/video/split/fullscreen playback, map comparison, heartbeat, offline playback and proof-of-play: **BLOCKED**.
- Thermal acceptance: **BLOCKED**; the current display is already at approximately 70–73°C and testing stopped.
- Installation: **NOT ATTEMPTED**. No app, HOME, pairing, cache or DeviceOS state was modified by this acceptance attempt.

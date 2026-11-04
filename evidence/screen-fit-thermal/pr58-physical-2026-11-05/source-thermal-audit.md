# PR #58 thermal source audit — 2026-11-05

Scope: offline source inspection and build validation only. No loaded board test, install, pairing change, HOME change, or reboot was performed in this pass. The thermal acceptance gate remains operator-supervised physical comparison.

## Source findings

- `NewsTicker` uses an infinite `Animatable.animateTo` loop while announcements are non-empty and the Activity is RESUMED. This necessarily requests animation frames while scrolling. The loop is inactive when announcements are empty or the Activity is not resumed. Its contribution to the board temperatures is not established.
- `ScreenViewModel` sends a heartbeat and polls commands on its 90-second cadence. `syncInternal()` also sends heartbeat and retrieves the manifest when sync is explicitly triggered. A separate WorkManager job schedules a 15-minute heartbeat.
- Before this change, every successful foreground sync enqueued the one-time proof worker even with an empty proof queue; that worker then sent another heartbeat and command poll. The worker now skips network work for an empty one-time queue. Periodic work is marked explicitly and retains its scheduled heartbeat using `ExistingPeriodicWorkPolicy.UPDATE`.
- The worker previously recursively re-entered its full heartbeat/poll path when a page contained only stale proofs. It now removes stale batches iteratively, performs the network preamble once, and uploads the first valid batch. Stale proof rows are still quarantined according to the existing identity checks.
- Media3 player creation is keyed by creative/playback identity and disposal releases the player. The playback watchdog samples position every 10 seconds only while video is playing. Earlier device evidence names the Allwinner AVC hardware decoder; the short captured ExoPlayer Loader/Playback thread utilization is in `top-single-video-threads.txt`.
- MapLibre is only initialized when the active navigation panel is composed. The existing lifecycle observer forwards each lifecycle event once; it explicitly avoids manually replaying start/resume. MapView is destroyed when released. No source path was found that creates a map for inactive navigation.
- Image decoding and QR generation are off the UI thread, keyed by media identity/region size, and bitmaps are recycled on disposal. No periodic decode loop was found.
- `FLAG_KEEP_SCREEN_ON` is used by the signage Activity to keep the display active. No partial wake lock was found in the app source.
- The screen ViewModel has a lifecycle-bound polling coroutine (90 seconds paired, 1 second only while technician repair mode is active, 90 seconds unpaired). It is cancelled with the ViewModel. Location provider updates are requested every 10 seconds with a 75 m minimum displacement only when location permission is granted.

## Changes in this pass

- Removed the empty-queue duplicate heartbeat/command poll from one-time proof work while retaining scheduled periodic heartbeat and pending-proof upload.
- Replaced stale-proof recursive worker execution with a iterative quarantine pass.
- Added debug-only event counters for Compose recompositions, players/decoders, decoded image/QR bytes, MapView instances, worker runs and request/poll counts.
- Added an explicit `diagnostics=true` debug harness mode. It samples frame metrics, app PSS and per-thread CPU ticks for five seconds, then emits one aggregate log line. It does not continuously log or automatically run.

## Existing physical evidence (before this source change)

The previous brief tests recorded CPU/GPU/VE/DDR sensor peaks of approximately 73.6/70.6/71.6/69.8°C during video and 76.4/73.0/72.3/71.4°C during a static split preview. A brief post-stop CPU sample showed the OORO app at 0% and total system CPU at 5.3%; these were not simultaneous steady-state measurements and do not establish causation. See `sensors-single-video.txt`, `sensors-four-zone-static.txt`, `top-single-video-threads.txt`, and `mem-single-video.txt` in this directory.

## Validation

`testDebugUnitTest lintDebug assembleDebug -PdeviceApiBaseUrl=https://api-staging.theooro.com -PuseMockBackend=false` passed. The APK from this source build has SHA-256 `9243c4c202958a2851ff3dda28439c503eee9f96607170847bebd111eaf6ac5d`.

No physical before/after comparison was made. This change reduces redundant network work and adds opt-in instrumentation; it does not establish that video decode, ticker animation, or another rendering path caused the observed heat. PR #58 remains open pending onsite-approved, short, supervised profiling and thermal comparison.

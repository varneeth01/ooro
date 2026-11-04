# Local Screen Player render/performance harness

This Activity and its test assets exist only in the Android `debug` source set. They are absent from release manifests and release APKs.

Generate the local edge-marker cards and short H.264 clips from the module directory with:

```bash
python3 tools/generate_render_test_assets.py
```

Asset generation requires Pillow and GStreamer with `videotestsrc`, `gdkpixbufoverlay`, `x264enc`, `h264parse`, and `mp4mux`. The portrait EXIF JPEG tests orientation metadata; video clips are local H.264 with edge overlays.

After checking the installed package signing identity and preserving the current app data, launch the debug-only harness with:

```bash
adb -s 6c001040f441c941d94 shell am start \
  -n com.ooro.screenplayer/.RenderTestActivity
```

The harness copies synthetic files into a per-activity app-cache subdirectory, passes those local paths through the production `Player`/`PrimaryAdRegion`/`PlayerView`/`MapPanel` renderers, and deletes only that test-cache directory on exit. It constructs an in-memory manifest and a null view model. Preview callbacks are disabled, so synthetic playback cannot enqueue or report proofs. The test `screenId` and campaign IDs are local labels only. The existing app process may still run its normal background heartbeat, manifest refresh, and proof-queue reconciliation; the preview does not alter pairing identity, production manifest contents, or queued proofs.

Controls select the source creative and layout, toggle MapLibre, ticker, and QR, and hide the controls for screenshots. A single tap in the top edge reopens the controls. `OoroRenderTest` log lines record source and measured viewport/content bounds. Media3's `OoroScreen` lines record decoder name and video-size/rotation metadata.

Use short supervised runs. The MapLibre-on case contacts OpenStreetMap tile servers; leave it off for offline media-fit checks. Press Back to return to the existing HOME activity.

## Bounded diagnostics scenarios

These are explicit debug-only extras. `diagnostics=true` takes exactly one five-second sample and logs one `OoroPerfDiag` aggregate: PSS before/after, per-thread CPU ticks, frame/slow/dropped counts, and bounded in-process counters. It does not enable itself on ordinary app startup.

For an isolated process sample, an operator may force-stop the Screen Player before launching the fixture below. This stops the app process without clearing its data, pairing, HOME selection, cache, or proof queue; launching the explicit debug activity starts the process again. Do this only on a development board. Already scheduled system work can resume normally after launch and will be counted if it runs during the sample.

Empty-content placeholder, zero manifest items, no PlayerView/media/map/ticker in the preview composition:

```bash
adb -s 6c001040f441c941d94 shell am start \
  -n com.ooro.screenplayer/.RenderTestActivity \
  --es scenario EMPTY_IDLE --ez diagnostics true
```

Short ticker in the actual FOUR_ZONE ticker region (text should fit and stay still):

```bash
adb -s 6c001040f441c941d94 shell am start \
  -n com.ooro.screenplayer/.RenderTestActivity \
  --es scenario SHORT_TEXT --es asset landscape --es layout FOUR_ZONE \
  --ez ticker true --ez map false --ez qr false --ez diagnostics true
```

Long synthetic ticker wider than the measured ticker viewport:

```bash
adb -s 6c001040f441c941d94 shell am start \
  -n com.ooro.screenplayer/.RenderTestActivity \
  --es scenario TICKER_OVERFLOW --es asset landscape --es layout FOUR_ZONE \
  --ez ticker true --ez map false --ez qr false --ez diagnostics true
```

The fixtures use the production composables, an in-memory manifest and local generated media. The empty fixture forces ticker/map/QR off and has no manifest items; the overflow fixture uses only a synthetic announcement. The preview itself has no view model, network client, pairing flow, heartbeat call, campaign, impression or proof path. An already-running MainActivity/WorkManager task can still do its ordinary scheduled work in the same process; the fixture does not fabricate that work. The Activity emits its scenario and manifest item count in `OoroRenderTest`. A long ticker keeps its animation confined to the ticker layer and is canceled when the Activity is paused or the ticker leaves composition.

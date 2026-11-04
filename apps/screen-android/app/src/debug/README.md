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

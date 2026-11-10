# OORO performance stabilization measurements

Date: 2026-11-11. Branch: `design/ooro-premium-interactive-experience`, PR #74. The tested app source was commit `2c8ecbe` (the temporary `content-visibility:auto` experiment below was removed because it did not improve the result). Tests used one optimized Next.js production build served at `http://127.0.0.1:3139/`; Lighthouse 13.2.0, Headless Chrome 146, Linux.

## Controlled Lighthouse batches

### Mobile (five runs)

Same URL/build, 412×823 viewport, DPR 1.75, simulated mobile network (150ms RTT, 1,638.4 Kbps throughput, 562.5ms request latency, 1,474.56 Kbps download, 675 Kbps upload), 4× CPU slowdown. Lighthouse mode: `simulate`.

| Run | Performance | Lighthouse simulated LCP | CLS | TBT | Browser trace image LCP candidate | Benchmark index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 80 | 3.302s | 0 | 478ms | 725ms | 1325 |
| 2 | 88 | 3.243s | 0 | 253ms | 537ms | 1917 |
| 3 | 82 | 3.289s | 0 | 436ms | 634ms | 1541 |
| 4 | 92 | 2.942s | 0 | 175ms | 411ms | 1482 |
| 5 | 94 | 2.866s | 0 | 92ms | 456ms | 1514 |
| **Median** | **88** | **3.243s** | **0** | **253ms** | **537ms** | **1514** |

The Lighthouse metric is its throttling-model result; the trace candidate column is the actual browser-observed `NavStartToLargestContentfulPaint` event from the saved trace. They are distinct values. The model LCP exceeds the 2.5s goal in all five runs; the browser trace candidates are much earlier. Benchmark indices varied substantially, so results are reported individually and not represented as field data.

LCP element in all five runs: `section.calm-hero > div.calm-shell > figure.calm-hero-media > img.calm-cover`, alt text “OORO field operations with an auto-rickshaw in Bengaluru”. Next Image selected the `w=750&q=75` optimized WebP (about 63.6KB transferred). `fetchpriority=high`, eager discovery and non-lazy loading were all confirmed.

Median phase durations from Lighthouse's LCP breakdown insight:

| Phase | Median |
| --- | ---: |
| Time to first byte | 11ms |
| Resource load delay | 27ms |
| Resource load duration | 25ms |
| Element render delay | 466ms |

Resource transfer is not the measured bottleneck. The larger phase is rendering, while Lighthouse's modeled LCP also differs sharply from the browser-observed trace candidate.

### Desktop, diagnostic run with the previous “desktop” throttling profile (five runs)

Same 1440×900 desktop emulation and the same 150ms/1,638.4 Kbps/4× mobile throttling profile above. This is deliberately retained as a diagnostic to reproduce the earlier 3.174s desktop result.

| Run | Performance | Lighthouse LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: |
| 1 | 72 | 3.238s | 0 | 206ms |
| 2 | 77 | 3.242s | 0 | 95ms |
| 3 | 74 | 3.241s | 0 | 175ms |
| 4 | 74 | 2.940s | 0 | 169ms |
| 5 | 82 | 2.935s | 0 | 32ms |
| **Median** | **74** | **3.241s** | **0** | **169ms** |

### Desktop, unthrottled desktop profile (five runs)

Same URL/build, explicit 1440×900 desktop emulation at DPR 1, desktop preset, `provided` throttling (no simulated CPU or network limits).

| Run | Performance | Lighthouse LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: |
| 1 | 100 | 0.534s | 0 | 0ms |
| 2 | 100 | 0.491s | 0 | 3ms |
| 3 | 91 | 0.502s | 0 | 248ms |
| 4 | 100 | 0.494s | 0 | 1ms |
| 5 | 91 | 0.499s | 0 | 246ms |
| **Median** | **100** | **0.499s** | **0** | **3ms** |

This reproduces the earlier ~100/0.65s desktop result (five-run median 100 / 0.499s at the explicit 1440×900 viewport). The later ~60/3.174s result used a desktop viewport but mobile CPU/network throttling; it is not a comparable desktop configuration. The 3.174s value is within the five-run range from the throttled diagnostic profile. This indicates a configuration mismatch, not an app regression.

## Optimization trial

A temporary `content-visibility:auto` rule on below-fold homepage sections, with intrinsic sizes, was tested and then discarded. Five same-profile mobile runs on that trial build had median Lighthouse LCP 3.247s, median TBT 322ms, and median element render delay 521ms, compared with 3.243s / 253ms / 466ms on the baseline. It did not improve the measured objective, so no CSS performance change was retained. The homepage and all article text remain server-rendered; no indexable content is deferred.

## Artifacts and limitations

Raw Lighthouse JSON, DevTools traces, and DevTools logs are in `artifacts/visual-acceptance/stabilization-v1/` (local, intentionally untracked). The screenshot matrix is in `artifacts/visual-acceptance/screenshots/`. These runs are local lab measurements, not production p75 Core Web Vitals. Production Coolify/VPS TTFB and Search Console field data were not available in this test environment.

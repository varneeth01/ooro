# Four-zone display upgrade

The existing screen player remains the device runtime. The upgrade changes only the presentation contract and additive delivery data:

- The left 67% is a stacked advertisement/news column. The advertisement consumes 86% of that column and the ticker consumes 14%.
- The right 33% is a stacked QR/navigation column. QR consumes 47% and navigation consumes 53%.
- `currentCreative` is set by the renderer start callback. The QR panel reads that state and is cleared when playback ends or fails, so it never advances on a separate timer.
- A QR-enabled creative is delivered with a server-owned opaque `/go/{token}` redirect. The existing `QrScan` attribution path records campaign, creative, and display identifiers when the redirect is requested.
- News announcements are filtered server-side by active window, city, and vehicle and cached with the normal atomic manifest.
- MapLibre and the existing GPS reporter remain isolated from ad playback. GPS without a supplied destination shows live location status rather than an invented route.

The migration is additive. Legacy campaign metadata QR destinations remain supported for compatibility, while newly uploaded creatives can store QR configuration directly on `Creative`.

Hardware validation remains separate from compilation: QR readability, physical video rendering, GPS fixes, map tiles, reboot/kiosk behavior, and database-backed device-to-server synchronization require an Android display or equivalent device test.

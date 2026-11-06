# Offer panel emulator screenshots

Captured from `OfferPanelScreenshotTest` on the disposable `OoroV3Clean` Android 16 emulator (1280×720, density 160). The smaller-resolution fixtures temporarily set the emulator to 854×480 and restore its original size in a `finally` block.

All creatives and offer metadata are synthetic. The debug harness uses the production player composables, makes no API calls, and has no proof writer. QR fixtures use `example.invalid`; the QR round-trip test uses a synthetic test URL and ZXing decode.

The V1/V2 screenshots document their existing presentation behavior. V3 screenshots cover an eligible offer, long text, brand-only metadata, missing/invalid destination, expired content, and the OORO house fallback.

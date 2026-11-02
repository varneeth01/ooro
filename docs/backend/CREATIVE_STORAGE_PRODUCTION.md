# Production creative storage acceptance — OORO

The admin campaign editor disables new media uploads when `GET /api/admin/creative-storage/status` returns `data.ready: false`. This is expected when `GCS_BUCKET_NAME` is absent in production. Do **not** work around this by writing creative files to ephemeral local storage.

## Coolify configuration (web runtime)

- Set `GCS_BUCKET_NAME` to an existing Google Cloud Storage bucket.
- Configure application-default Google credentials **server-side** (e.g. `GOOGLE_APPLICATION_CREDENTIALS` pointing to a securely mounted service-account JSON file). Never expose the key in the browser, GitHub or `NEXT_PUBLIC_*` variables.
- Grant the writer identity the minimum upload permissions required.
- Configure `PUBLIC_ASSET_BASE_URL` only if the domain is actually backed by a CDN/media origin that serves `/uploads/<object-key>` from this bucket. Do not set it to `https://theooro.com` without a real media-serving route.
- Without that override, uploads return `https://storage.googleapis.com/<bucket>/uploads/<key>`. **Private buckets will not serve these anonymously.** For private media, deploy an authenticated/signed delivery mechanism compatible with Screen Player fetching and rotating credentials *before* accepting campaigns. Do not make sensitive or customer creatives public just to clear a warning.

## Acceptance checks

1. Confirm the admin account has `creative:write` permission, then verify the status endpoint. Its current readiness result is **configuration-only** and does not prove object-store connectivity.
2. Upload a small approved test JPG/MP4 to a draft campaign.
3. Inspect returned asset URL and checksum; from a separate authorized device/network fetch that URL and confirm the bytes match the checksum. A write-only success is insufficient.
4. Verify MIME, dimensions and playback from the actual Screen Player, including offline cache and proof-of-play.
5. Test error handling when bucket credentials are revoked, media URLs expire or the device is offline.
6. Verify activating a campaign only after media is accessible and the admin has approved scheduling.
7. Record staging acceptance before promotion to production; keep rollback configuration and bucket credentials private.

The uploader currently stores directly through the web runtime `@google-cloud/storage` client. Changing the bucket environment variables requires redeploying/restarting the correct web service. A service-account key stored only in the backend container will not automatically configure the Next.js web container.

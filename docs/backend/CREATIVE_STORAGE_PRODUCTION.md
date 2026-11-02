# OORO Creative Storage — Cloudflare R2 + PostgreSQL

Campaign creative bytes are uploaded to Cloudflare R2 by the **Next.js web** runtime. PostgreSQL stores the creative and asset records, checksum, object key and delivery URL. Do not use GCS or an ephemeral production filesystem.

## Coolify web application environment (secret values: configure privately)

- `R2_ACCOUNT_ID`: Cloudflare account identifier
- `R2_BUCKET_NAME`: existing media bucket
- `R2_ACCESS_KEY_ID`: R2 API token access key with write permission to this bucket
- `R2_SECRET_ACCESS_KEY`: matching private secret
- `PUBLIC_ASSET_BASE_URL`: dedicated HTTPS custom domain whose root maps to the selected R2 bucket (for example `https://media.example.com`). This setting is server-only, not `NEXT_PUBLIC_*`. The resulting creative URL is `<base>/uploads/<object-key>`.

The custom domain must actually serve the objects to the Screen Player with the intended access policy. **Never assume that theooro.com serves R2 media.** Do not put credentials in code, public variables, GitHub issues, screenshots or browser settings. For confidential customer assets, use a private-bucket delivery proxy or renewable signed URLs with appropriate Android offline caching; do not expose private files through an open domain.

Web runtime restart/redeploy is needed after changing Coolify environment. Separate DeviceOS R2 settings do not automatically configure Next.js creative uploads. Database connection remains PostgreSQL; no schema migration is required by this change.

## Behavior

- `GET /api/admin/creative-storage/status` checks that the R2 connection settings and the HTTPS media origin are present. It does **not** contact R2 or confirm access permissions.
- `POST /api/admin/campaigns/:id/creative` validates the image/video and uploads to `uploads/<sha256>-<safe filename>` with S3 Signature V4 over HTTPS.
- A failed storage upload does not create creative/asset DB rows. The campaign editor still avoids activating a campaign without a successful creative upload.
- In nonproduction environments with no R2 settings, local filesystem upload remains available for developer testing only.

## Staging-to-production acceptance (required)

1. In staging, confirm `creative-storage/status` returns ready, provider `r2`; verify bucket and DNS/CNAME custom domain mapping privately.
2. Upload an approved test JPG and MP4 to a **draft** campaign. Confirm 201 results, checksum, database records, URL and MIME.
3. On the **physical Screen Player**, retrieve the returned URL, verify SHA-256 bytes, video decoder, image display, offline cache and proof-of-play acknowledgements.
4. Verify expired/incorrect credentials and inaccessible media domain produce safe errors and do not activate a campaign.
5. Check access-policy risks: media domain must not expose confidential creatives. Validate proper caching, HTTPS and route-specific authorization where needed.
6. Run typecheck, lint, build and API tests; confirm existing campaign/asset playback regression checks.
7. Only after staging acceptance, configure production Coolify web env and deploy using a rollback plan. Confirm upload and real device playback again.

PostgreSQL is unchanged. A passing GitHub build alone does not establish R2 credentials or physical playback readiness.

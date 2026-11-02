# OORO R2 settings for deployed services

The `ooro-creatives` bucket and `media.theooro.com` custom domain are shared infrastructure, but environment variables must be configured **per Coolify service**. Do not commit any credentials.

## ooro-web (required for current campaign uploads)

Configure `R2_ACCOUNT_ID`, `R2_BUCKET_NAME=ooro-creatives`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `PUBLIC_ASSET_BASE_URL=https://media.theooro.com`. Redeploy the web service and log in as an administrator; `GET /api/admin/creative-storage/status` must return `data.ready: true` and `data.provider: "r2"`. The `missing` array reports *names* of unset or invalid fields only; never expose secret values.

## ooro-api

If the API also uploads **campaign creatives**, provision the matching account/bucket credentials as scoped Coolify secrets in that service; they do not automatically propagate from `ooro-web`. At present, campaign creation/creative uploads use the Next.js routes, so merely adding `R2_*` to `ooro-api` does not fix the warning in `ooro-web`. Preserve existing separate `DEVICEOS_S3_*` and `DOCUMENT_STORAGE_*` settings.

Use restricted per-service R2 credentials instead of reusing an unnecessarily broad key. Confirm expected consumers before granting the API creative-bucket read/write permissions.

## Production acceptance

1. Verify the service was redeployed with the environment attached (the build and runtime may use different configurations).
2. Verify authenticated admin readiness, and that `missing` is empty.
3. Upload a small approved test creative to a draft, inspect the returned media URL and confirm the object is retrievable at `media.theooro.com`.
4. Test authorized playback/download and checksum from a physical Screen Player.
5. Ensure at least one screen is ONLINE before asserting real-time delivery. Offline devices may queue sync but cannot confirm playback.
6. Publishing commercially funded advertising must use the order/payment/approval and scheduler controls, not bypass internal-test safeguards.

# OORO operations portal and schedule delivery

The protected admin route group lives under `app/admin/(protected)`. Edge middleware decrypts the HttpOnly AES-GCM `ooro_session`, validates the access token with the API session endpoint, then the server layout validates admin role again. Admin API routes independently require server-authenticated admin roles. The web fallback admin token is intentionally not supported.

The scheduler uses the existing campaign, creative, display assignment, device command, inventory allocation, heartbeat, proof-of-play and audit tables, plus `AdSchedule`, transport `Route`/`Depot`, and many-to-many `ScreenGroup` membership. `AdSchedule` is one versioned schedule per campaign; multiple daily windows and ordered creatives belong to its JSON rules. Inventory reservations use the existing unique `(screenId,date,slot)` ledger. Publication runs in a serializable transaction and queues manifest refresh commands for added and removed screens. Devices fetch the current manifest on sync and report heartbeat and proof through the existing authenticated device API.

Schedule dates are UTC instants. The scheduler accepts `Asia/Kolkata` only and converts wall-clock selection to the matching UTC offset. Daypart boundaries are end-exclusive. Existing `ACTIVE` creatives are migrated to `APPROVED` to preserve previously playable campaigns; new uploads default to `PENDING_REVIEW`.

## Required production settings

- API: `DATABASE_URL`, `JWT_SECRET` (at least 32 characters), `DEV_MOCK_OTP_ENABLED=false`, production CORS origins, MongoDB/payment settings for their existing features.
- Web: `OORO_SESSION_SECRET` (at least 32 characters), `OORO_BACKEND_API_URL` pointed at the deployed API origin, HTTPS site and asset base URLs, `GCS_BUCKET_NAME`, and Cloud Run service identity permissions for the bucket/database.
- Admin login: `ADMIN_WEB_BASE_URL` must be the HTTPS web origin, with `EMAIL_PROVIDER_API_KEY` and a verified `EMAIL_FROM` for one-time password setup and reset links. Admin credentials are never stored in deployment configuration.
- Android release: `OORO_DEVICE_API_URL` or Gradle property `deviceApiBaseUrl`, set to the HTTPS device API origin. Release builds fail when it is missing.
- Web container: `ffprobe` is installed from Debian packages and is required to derive creative media dimensions and video duration from uploaded bytes.

Before deployment, apply migrations with `pnpm --filter @ooro/api exec prisma migrate deploy`, then build the API/web containers. Configure Cloud Run to use the API's Cloud SQL/VPC database path, secrets from Secret Manager, the required storage IAM role, HTTPS origin, and the correct API URL in the web service. This repository does not include a Cloud Run service descriptor, and the configured public Next.js site is also built for Netlify; verify which web origin is active before rollout.

The schedule engine supports deterministic sequence/weighted ordering, paced frequency, priority, exclusive/emergency precedence, dates, weekdays and windows. Frequency values are pacing targets; device uptime and changing network location affect delivery. Share-of-loop is a slot-weighted approximation. Radius targeting resolves current GPS positions at publication time; it is not a live geofence. Group membership changes take effect after republishing affected schedules.

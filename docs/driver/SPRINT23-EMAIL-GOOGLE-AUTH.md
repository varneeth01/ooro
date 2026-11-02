# Sprint 23 — OORO Driver Email OTP + Google Sign-In

The Driver app now uses dedicated authentication endpoints:

- `GET /api/driver/auth/config`
- `POST /api/driver/auth/email/request-otp`
- `POST /api/driver/auth/email/verify-otp`
- `POST /api/driver/auth/google`
- `POST /api/driver/auth/email/link/request-otp` (authenticated)
- `POST /api/driver/auth/email/link/verify-otp` (authenticated)
- `POST /api/driver/auth/google/link` (authenticated)

The existing `/api/auth/request-otp` and `/api/auth/verify-otp` phone provider
routes remain available behind `DRIVER_AUTH_PHONE_ENABLED`. The global
`OTP_PROVIDER` is not changed by this feature; WhatsApp Cloud and MSG91 remain
inactive options unless explicitly selected for the legacy phone flow.

## Coolify variables

Keep the existing email variables configured:

```text
DRIVER_AUTH_EMAIL_ENABLED=true
EMAIL_PROVIDER_API_KEY=<existing Resend-compatible server secret>
EMAIL_FROM=OORO <verified sender address>
```

To enable Google in a deployment, configure:

```text
DRIVER_AUTH_GOOGLE_ENABLED=true
GOOGLE_WEB_CLIENT_ID=<Google Web OAuth client ID ending in .apps.googleusercontent.com>
```

No WhatsApp variables are required for Email OTP or Google Sign-In. Never put
the Google client secret or Resend secret in the APK or repository.

## Google OAuth setup

1. In the Google Cloud project used by OORO, configure the OAuth consent screen
   and publish/allow the required staging testers.
2. Create Android OAuth clients for `com.ooro.driver.staging` and
   `com.ooro.driver`, using the actual SHA-1 fingerprints of the staging and
   official signing certificates. The repository does not contain the official
   release keystore, so the release fingerprint must be supplied by the release
   owner.
3. Create or select a Web application OAuth client and set its client ID as
   `GOOGLE_WEB_CLIENT_ID`. This is the server audience and must be the same ID
   passed to Android Credential Manager through `/api/driver/auth/config`.
4. Keep staging and production API origins separate. The ID token is sent to
   OORO over HTTPS and verified server-side against Google's rotating JWKS,
   issuer, audience, expiry, verified-email claim, and stable `sub` value.

The staging Gradle variant remains `com.ooro.driver.staging`; the official
release remains `com.ooro.driver`. No duplicate launcher application is added.

## Identity and phone state

Email OTP creates an idempotent Driver identity only after the email challenge
is verified. Google creates or retrieves a Driver only by verified Google
subject. A Google email matching an existing Driver email is rejected until an
authenticated account-linking endpoint is used; email matching alone never
links accounts. Linking requires an existing OORO session plus a verified
email OTP or Google ID token.

`User.emailVerifiedAt` and `User.phoneVerifiedAt` distinguish verified claims
from profile values. Email/Google sign-in does not verify the driver's phone;
the onboarding profile collects it as an unverified value for later server-side
verification.

## Database migration

`20261102090000_driver_email_google_auth` is additive. It makes the legacy phone
column nullable for email/Google-first drivers, adds verification timestamps,
creates `DriverEmailOtpChallenge`, and creates `DriverAuthIdentity` with unique
provider/subject and driver/provider constraints. The companion
`20261102091000_deviceos_application_flags` migration repairs two additive
DeviceOS columns that are already required by the schema/runtime. Both preserve
existing User, Session, Driver, Vehicle, Display, Admin, DeviceOS, duty,
earning, payout, and KYC rows.

For staging, take a database backup/snapshot, point `DATABASE_URL` only at the
staging database, run `pnpm --filter @ooro/api exec prisma migrate deploy`,
verify `prisma migrate status`, then restart the staging API and run the
auth/DeviceOS smoke checks. Do not run this against production as part of local
validation; production remains an operator-controlled migration.

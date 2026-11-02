# Sprint 21 integration record

This repository uses one PostgreSQL/Prisma backend and one canonical Driver application. The existing integration surface is reused; no parallel backend, database, or Android Driver project is introduced.

## Integration matrix

| Capability | Existing implementation | Sprint 21 status |
| --- | --- | --- |
| Driver OTP/session | `/api/auth/request-otp`, `/api/auth/verify-otp`, refresh/logout sessions | Implemented; real SMS requires Coolify provider configuration and a live test |
| Driver onboarding/KYC | `/api/drivers/me/onboarding`, upload sessions, remote scan gate, admin review | Implemented; physical/provider acceptance remains operator-blocked |
| Driver → vehicle → display | `Driver`, `Vehicle`, `Display.vehicleId` | Server-authoritative pairing guard added |
| Admin display assignment | `PATCH /api/admin/displays/:displayId/assignment` | Implemented with active-driver validation and audit event |
| Driver display pairing | `POST /api/displays/pair` | Restricted to approved active drivers, verified vehicles, and matching server assignment |
| Screen authentication | short-lived pairing code → hashed device token | Existing flow preserved |
| Screen heartbeat/location | `/api/device/heartbeat`, display heartbeat/location tables | Implemented; admin health/map APIs expose sanitized telemetry |
| Playback/campaign delivery | manifest, command queue, playback proof, offline cached manifest | Existing behavior preserved |
| Duty/GPS/ride events | duty sessions, duty locations, mobility events, ride verification | Implemented; requires authenticated approved driver and permissions |
| Earnings/payouts | verified earning entries, beneficiary review, payout records | Implemented; provider settlement is not claimed as live |
| Support | driver ticket creation and admin support permissions | Implemented |

## SMS provider configuration

The backend OTP challenge remains the only authentication flow. `OTP_PROVIDER=msg91` selects the MSG91 adapter; the adapter sends the generated OTP to the configured DLT template and never returns or logs the code in production. `OTP_PROVIDER=webhook` preserves the existing operator gateway integration.

Coolify variables:

- `OTP_PROVIDER=msg91`
- `MSG91_AUTH_KEY`
- `MSG91_TEMPLATE_ID` (approved DLT template)
- `MSG91_SENDER_ID` (if required by the approved route)
- `MSG91_DELIVERY_URL` (normally `https://control.msg91.com/api/v5/otp`)
- `OTP_TTL_SECONDS`
- `DEV_MOCK_OTP_ENABLED=false`
- `OORO_STAGING_OTP_TEST_MODE` only for a dedicated synthetic staging phone/code, never for production

Alternative webhook variables remain `OTP_PROVIDER=webhook`, `OORO_OTP_DELIVERY_URL`, and `OORO_OTP_DELIVERY_TOKEN`.

## Acceptance blockers

No provider-backed SMS delivery, authenticated physical Android acceptance, private R2/ClamAV staging acceptance, or Super Admin credentialed end-to-end journey is claimed from local tests. Those require authorized Coolify staging configuration and operator-controlled test accounts. Do not place credentials, OTPs, DLT values, or real KYC documents in source control or chat.

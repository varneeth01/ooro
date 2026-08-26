# Driver app API contract

The driver app and Screen Player share `driverId`, `vehicleId`, `displayId`, `rideId`, `campaignSessionId`, `manifestVersion`, `creativeId`, `proofId`, and heartbeat identity. The backend is authoritative for KYC, ride verification, payout amounts, wallet ledger, display commands, and permissions.

## Auth and onboarding

`POST /api/auth/request-otp`, `POST /api/auth/verify-otp`, `GET/PATCH /api/driver/me`, `POST /api/kyc/document`, `GET /api/kyc/status`, `POST /api/vehicles`, and `POST /api/displays/pair`.

## Ride and display

`POST /api/mobility/events` accepts normalized, idempotent ride events. `POST /api/rides/candidates`, `POST /api/rides/{id}/events`, `POST /api/rides/{id}/location`, and `POST /api/rides/{id}/complete` persist lifecycle evidence. Display commands use a server queue: `WAKE`, `SLEEP`, `START_SESSION`, `STOP_SESSION`, `SYNC_MANIFEST`, and `HEALTH_CHECK`; the driver app never connects directly to a display.

## Money and support

`GET /api/earnings/summary`, `GET /api/earnings/ledger`, `GET /api/wallet`, `POST /api/payouts`, `POST /api/safety/incidents`, `POST /api/roadside/requests`, and `POST /api/support/tickets`.

Every event uses an idempotency key. Device tokens, OTP secrets, Aadhaar, bank credentials, passenger PII, and raw mobility notifications must never be returned to the client beyond the minimum needed for the current workflow.

# Sprint 22 — WhatsApp Cloud OTP

The driver OTP service supports Meta WhatsApp Cloud API as the selected provider. It reuses the existing challenge table, hash/expiry/attempt protections, driver sessions, and Android request/verification endpoints. It does not create a second identity store or authentication flow.

## Coolify configuration

Configure these variables in the authorized staging or production Coolify environment. Do not place values in the repository, Android project, or local `.env` files.

```text
OTP_PROVIDER=whatsapp_cloud
WHATSAPP_ACCESS_TOKEN=<server-only Meta token>
WHATSAPP_PHONE_NUMBER_ID=<WhatsApp sender phone number ID>
WHATSAPP_BUSINESS_ACCOUNT_ID=<WhatsApp business account ID>
WHATSAPP_OTP_TEMPLATE_NAME=<approved authentication template name>
WHATSAPP_OTP_TEMPLATE_LANGUAGE=en_US
WHATSAPP_GRAPH_API_VERSION=v<supported-version>
WHATSAPP_APP_SECRET=<Meta app secret, for signed webhook verification>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<private webhook verification token>
DEV_MOCK_OTP_ENABLED=false
OTP_TTL_SECONDS=300
```

`WHATSAPP_APP_SECRET` and `WHATSAPP_WEBHOOK_VERIFY_TOKEN` are needed when delivery-status webhooks are enabled. MSG91 remains available as an optional provider through its existing variables; it is not required by the WhatsApp path.

Staging-only synthetic OTP mode remains separate and must use a dedicated test phone. It must never be enabled in production and must not be used to claim real WhatsApp delivery.

## Meta setup

1. In the Meta Business Manager/WhatsApp Manager account, verify the sender phone and confirm the Cloud API phone-number ID and business-account ID.
2. Create and obtain approval for an Authentication template using the Copy Code OTP format. The configured template must be `APPROVED`, in category `AUTHENTICATION`, with a copy-code button. The API rejects unapproved or structurally different templates before attempting delivery.
3. Create a server-side system-user access token with only the WhatsApp permissions required for message sending and template/status access. Store it only in Coolify.
4. Set the Graph version explicitly, for example `vXX.X`, to a currently supported version approved by the operator.
5. Configure the Meta webhook callback to `https://<staging-api-host>/api/webhooks/whatsapp`, using the verify token above and the app secret for signed callbacks. Subscribe to message status updates.

The send request uses Meta's authentication-template body parameter and URL copy-code button parameter. A successful Graph response is recorded as `ACCEPTED`; it is not treated as delivered until a signed webhook reports `sent`, `delivered`, or `read`. Failed status callbacks are stored as aggregate error codes only.

## Safety behavior

- Meta credentials, OTP codes, phone numbers, and webhook bodies are not logged.
- HTTPS, a ten-second provider timeout, and fail-closed provider/template checks are enforced.
- Invalid credentials, network failure, timeout, missing message ID, rejected template, and delivery failure do not issue a successful OTP response.
- OTPs remain server-side hashes, expire after the configured TTL, are single-use, and have a five-attempt limit.
- Requests have a server-side thirty-second resend cooldown and three-per-minute rate limit.
- The admin provider-health endpoint reports only provider name, configuration booleans, aggregate statuses, safe error codes, and policy values.

## API and Android

Existing endpoints remain in use:

- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `GET /api/admin/otp/provider-health` (admin permission required)
- `GET/POST /api/webhooks/whatsapp` (Meta verification and signed status callback)

The canonical Android app displays WhatsApp-specific delivery, loading, retry, and resend-countdown states. It contains no Meta credentials and uses the staging URL supplied through `driverStagingApiUrl` for staging builds.

## Verification

Local tests use synthetic documents/phones and mocked Graph responses only. Real WhatsApp acceptance requires an operator to configure Coolify and perform a test with an authorized staging phone; no real delivery is claimed by this repository change.

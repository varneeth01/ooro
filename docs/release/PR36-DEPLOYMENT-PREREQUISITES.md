# PR #36 deployment prerequisites

PR #36 does not require WhatsApp variables when production uses the existing
`OTP_PROVIDER=webhook` or `OTP_PROVIDER=msg91` adapter. The API validates only
the selected provider, and no OTP is returned or accepted without a real
provider delivery in production.

If `DRIVER_AUTH_PHONE_ENABLED=false` and no other active phone-auth consumer
uses the legacy adapter, `OTP_PROVIDER`, `OORO_OTP_DELIVERY_URL`, and
`OORO_OTP_DELIVERY_TOKEN` may be omitted. The legacy phone endpoints reject
requests in that mode. The default remains `DRIVER_AUTH_PHONE_ENABLED=true`,
so existing SMS/webhook deployments retain their current prerequisite set.

Before deploying with `OTP_PROVIDER=webhook`, retain:

- `OORO_OTP_DELIVERY_URL` using `https://`
- `OORO_OTP_DELIVERY_TOKEN`

Before deploying with `OTP_PROVIDER=msg91`, configure:

- `MSG91_AUTH_KEY`
- `MSG91_TEMPLATE_ID`
- `MSG91_DELIVERY_URL` if the default endpoint is not used
- `MSG91_SENDER_ID` when required by the approved route

Before selecting `OTP_PROVIDER=whatsapp_cloud`, configure all of:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_OTP_TEMPLATE_NAME` for an approved Authentication template with a
  copy-code button
- `WHATSAPP_OTP_TEMPLATE_LANGUAGE`
- `WHATSAPP_GRAPH_API_VERSION` in `v<major>.<minor>` form

To enable signed WhatsApp webhook verification and delivery-status updates,
also configure `WHATSAPP_APP_SECRET` and
`WHATSAPP_WEBHOOK_VERIFY_TOKEN`, then register the callback at
`/api/webhooks/whatsapp`. If either webhook credential is absent, the callback
returns an unauthorized response and does not process the request.

Apply the additive Prisma migrations with `prisma migrate deploy` against the
intended staging database before starting the new API. PR #36 adds
`20261102090000_driver_email_google_auth`; the companion
`20261102091000_deviceos_application_flags` repairs two additive DeviceOS
columns required by the existing runtime. Take a backup/snapshot first and
verify `prisma migrate status` afterward. These migrations do not alter or
delete existing sessions, Driver, Display, Admin, or DeviceOS records.

Deployment remains an operator-controlled action. Do not merge or redeploy
production from this review, and do not place credentials in source control.

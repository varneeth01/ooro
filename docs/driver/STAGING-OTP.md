# Staging OTP test mode

The API supports an explicit, staging-only OTP path for a disposable driver account when an approved SMS provider is unavailable.

Required Coolify staging variables:

- `NODE_ENV=production`
- `OORO_DEPLOYMENT_ENV=staging`
- `OORO_STAGING_OTP_TEST_MODE=true`
- `OORO_STAGING_OTP_TEST_PHONE=<one dedicated synthetic phone>`
- `OORO_STAGING_OTP_TEST_CODE=<six-digit protected secret>`

The code is never returned by the API and is not logged. The normal OTP challenge remains persisted as a hash with the configured expiry, request rate limit, five-attempt limit and single-use consumption. All other phone numbers still require the configured HTTPS SMS provider.

This mode must not be enabled in production. Startup fails if the deployment marker, phone or code is invalid. Disable it before any real-driver or production rollout.

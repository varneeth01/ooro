# Admin email/password authentication rollout

This change replaces only the admin phone OTP flow. Driver OTP, display bearer tokens, DeviceOS credentials, and existing admin roles remain in place.

## Staging prerequisites

Configure these API environment variables in Coolify for the staging API:

- `NODE_ENV=production`
- `ADMIN_WEB_BASE_URL=https://staging.theooro.com`
- `EMAIL_PROVIDER_API_KEY` with a verified sender/domain
- `EMAIL_FROM` using that verified sender
- `JWT_SECRET` and `OORO_SESSION_SECRET` as independent random secrets of at least 32 characters
- `DEV_MOCK_OTP_ENABLED=false`

The existing email provider is Resend-compatible. No password, reset token, or OTP is placed in the image or repository.

## Database migration

Deploy the additive Prisma migration before switching the web/API containers:

```sh
pnpm --filter @ooro/api prisma migrate deploy
```

Do not run `prisma migrate reset`, `db push`, or a destructive migration. The migration adds nullable password/token fields, session metadata, and a login-throttle table. Existing users, sessions, roles, drivers, and device records are retained.

## First SUPER_ADMIN

Use the production-only bootstrap job with operator-provided phone, name, email, and confirmation. The job refuses to run if any admin already exists and sends a one-time password setup link. The email is required; credentials are never hardcoded.

For the checked-in GCP helper, provide the temporary job with `ADMIN_WEB_BASE_URL` and the email-provider secret. For Coolify, run the equivalent one-shot command in the API container with the same environment and:

```sh
NODE_ENV=production ADMIN_BOOTSTRAP_CONFIRM=I_UNDERSTAND \
ADMIN_BOOTSTRAP_PHONE='<operator supplied phone>' \
ADMIN_BOOTSTRAP_NAME='<operator supplied name>' \
ADMIN_BOOTSTRAP_EMAIL='<operator supplied email>' \
ADMIN_WEB_BASE_URL='https://staging.theooro.com' \
pnpm --filter @ooro/api admin:bootstrap
```

Do not put those values in a committed `.env` file or Docker image.

## Existing admins

Existing active admin accounts are not deleted or downgraded. They have no password until an operator sends a setup link:

```sh
NODE_ENV=production ADMIN_PASSWORD_SETUP_CONFIRM=I_UNDERSTAND \
pnpm --filter @ooro/api admin:password-setup
```

To target one admin, also set `ADMIN_PASSWORD_SETUP_EMAIL`. Every targeted account must already have a unique email. The link expires and is single-use.

## Staging acceptance checklist

1. Run the migration and confirm the API starts with the production configuration checks.
2. Set the first admin password from the emailed link, then sign in at `/admin/login`.
3. Refresh the page, open the admin dashboard, campaign management, and DeviceOS operations.
4. Sign out and confirm the old session cannot load `/admin` or call an admin API.
5. Test an unknown email and wrong password; both return the same generic message.
6. Request a reset for a known and unknown email; both return the same generic response.
7. Use a reset link twice and after expiry; both attempts must fail.
8. Verify role boundaries: DeviceOS writes remain limited to `ADMIN`, `SUPER_ADMIN`, and `OPERATIONS`; orders retain their finance access; support/finance cannot enter unrelated write paths.
9. Verify driver OTP, Android Screen Player pairing, heartbeats, and DeviceOS bearer authentication remain functional.

## Rollback

1. Stop the web/API rollout and redeploy the previous application image.
2. Keep the additive migration in the database. The previous application ignores the new nullable columns and table.
3. Do not delete the new columns or revoke existing sessions during rollback.
4. If a password was set during staging, revoke that admin’s sessions through the existing session store and use the existing account-status controls; do not reset the database.
5. Investigate failed email delivery or role authorization before retrying the rollout.

The migration is intentionally forward-compatible; removing its columns is not part of rollback.

# Local backend development

1. Start PostgreSQL and Redis with `docker compose -f apps/api/docker-compose.yml up -d`.
2. Configure `DATABASE_URL`, `JWT_SECRET`, `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`, and `DEV_MOCK_OTP_ENABLED=true` only for local development.
3. Apply migrations with `pnpm --filter @ooro/api prisma:migrate`.
4. Apply migrations and seed the development admin/demo data:

   ```bash
   pnpm --filter @ooro/api prisma:migrate
   pnpm --filter @ooro/api prisma:seed
   ```

   The seed is idempotent and creates the development `SUPER_ADMIN` at `DEV_ADMIN_EMAIL` using the operator-provided development password. It does nothing when `NODE_ENV=production`.
5. Open `/admin/login` and sign in with `DEV_ADMIN_EMAIL` and `DEV_ADMIN_PASSWORD`.
5. Start the API with `pnpm --filter @ooro/api dev`.

Driver OTP mock mode is available only when the development flag is enabled and `NODE_ENV` is not production. Admin sign-in uses the development email/password seed. Pairing codes are generated server-side using cryptographic random bytes, hashed at rest, expire after ten minutes, and are single-use.
